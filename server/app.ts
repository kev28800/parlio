import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { Database, type RemoteDatabaseOptions } from "./database.js";
import { createAi, AiError, type AiOverrides } from "./ai.js";
import {
  createBilling,
  BillingError,
  type BillingOverrides,
} from "./billing.js";
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { z } from "zod";
import {
  exerciseById,
  isUnlocked,
  lessonById,
  getCourse,
  courses,
  courseIds,
  lessonCourse,
  exerciseCourse,
} from "../shared/courses.js";
import {
  computeStreak,
  expectedAnswer,
  grade,
  localDay,
  practiceNotion,
  shiftDay,
} from "../shared/learning.js";
import type {
  Answer,
  AppState,
  Feedback,
  Exercise,
  LessonResult,
  CourseId,
  Notion,
  Preferences,
  RunView,
} from "../shared/types";
const scrypt = promisify(scryptCallback);
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const SESSION_LIFETIME = 30 * 86400000;
const defaults: Preferences = {
  courseId: "en",
  level: "beginner",
  goal: "travel",
  dailyMinutes: 5,
  timezone: "Europe/Paris",
  sound: true,
  reducedMotion: false,
  onboarded: false,
};
type UserRow = {
  id: string;
  email: string | null;
  name: string;
  password: string | null;
  guest: number;
  preferences: string;
};
type Run = {
  source?: "ai";
  exerciseSnapshot?: Exercise[];
  courseId?: CourseId;
  id: string;
  userId: string;
  lessonId: string | null;
  review: boolean;
  exerciseIds: string[];
  cursor: number;
  answers: Feedback[];
  result: LessonResult | null;
};
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function createApp(
  databasePath = process.env.DATABASE_PATH || resolve("data/parlio.sqlite"),
  remoteOptions: RemoteDatabaseOptions | undefined = process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }
    : undefined,
  services: { billing?: BillingOverrides; ai?: AiOverrides } = {},
) {
  if (process.env.REQUIRE_REMOTE_DATABASE === "true" && !remoteOptions?.url)
    throw new Error(
      "DATABASE_URL manque : une base distante est requise pour conserver la progression sur cet hébergement.",
    );
  const db = await Database.open(databasePath, remoteOptions);
  await db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL, password TEXT,
      guest INTEGER NOT NULL DEFAULT 1, preferences TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS notions (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, concept TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(user_id, concept));
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS runs_user ON runs(user_id);
  `);
  const app = express();
  app.disable("x-powered-by");
  // À activer seulement lorsque l'hébergeur fournit un proxy de confiance.
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 3)
    throw new Error("TRUST_PROXY_HOPS doit être un entier entre 0 et 3.");
  app.set("trust proxy", proxyHops);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Permissions-Policy",
      "microphone=(self), camera=(), geolocation=()",
    );
    if (process.env.NODE_ENV === "production")
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      );
    next();
  });
  const billing = await createBilling(db, services.billing);
  const ai = await createAi(db, services.ai);
  await db.exec(
    "CREATE TABLE IF NOT EXISTS ai_daily_practice (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL, course_id TEXT NOT NULL, request_id TEXT NOT NULL, PRIMARY KEY(user_id,day,course_id))",
  );
  billing.publicRoutes(app);
  app.use("/api", express.json({ limit: "16kb" }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.get("origin");
      if (
        req.get("x-parlio-request") !== "1" ||
        !req.is("application/json") ||
        req.get("sec-fetch-site") === "cross-site"
      )
        return next(
          new ApiError(403, "Requête non autorisée. Rechargez la page."),
        );
      try {
        if (origin && new URL(origin).host !== req.get("host"))
          return next(
            new ApiError(403, "Origine de la requête non autorisée."),
          );
      } catch {
        return next(new ApiError(403, "Origine invalide."));
      }
    }
    next();
  });
  // Un contrôle de santé ne doit pas créer de session ni d'utilisateur d'essai.
  app.get("/api/health", async (_req, res) => {
    try {
      await db.prepare("SELECT 1").get();
      res.json({ status: "ok", service: "parlio" });
    } catch {
      res.status(503).json({ status: "unavailable", service: "parlio" });
    }
  });
  async function user(id: string) {
    return (await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id)) as UserRow;
  }
  async function allRuns(id: string): Promise<Run[]> {
    return (
      (await db
        .prepare(
          "SELECT data FROM runs WHERE user_id = ? ORDER BY updated_at DESC",
        )
        .all(id)) as {
        data: string;
      }[]
    ).map((row) => JSON.parse(row.data));
  }
  async function notions(id: string): Promise<Notion[]> {
    return (
      (await db
        .prepare("SELECT data FROM notions WHERE user_id = ?")
        .all(id)) as {
        data: string;
      }[]
    ).map((row) => JSON.parse(row.data));
  }
  async function saveRun(run: Run) {
    await db
      .prepare(
        "INSERT INTO runs (id,user_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      )
      .run(run.id, run.userId, JSON.stringify(run), new Date().toISOString());
  }
  async function transaction<T>(fn: () => T | Promise<T>): Promise<T> {
    return await db.transaction(fn);
  }
  async function createGuest(): Promise<UserRow> {
    const id = randomUUID();
    await db
      .prepare(
        "INSERT INTO users (id,email,name,password,guest,preferences,created_at) VALUES (?,NULL,?,NULL,1,?,?)",
      )
      .run(id, "Vous", JSON.stringify(defaults), new Date().toISOString());
    return await user(id);
  }
  async function session(res: Response, userId: string) {
    const token = randomBytes(32).toString("hex");
    await db
      .prepare("INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)")
      .run(digest(token), userId, Date.now() + SESSION_LIFETIME);
    res.cookie("parlio_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true" ||
        (process.env.NODE_ENV === "production" &&
          process.env.COOKIE_SECURE !== "false"),
      maxAge: SESSION_LIFETIME,
      path: "/",
    });
    res.locals.sessionHash = digest(token);
    res.locals.userId = userId;
  }
  app.use("/api", async (req, res, next) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("parlio_session="))
      ?.slice("parlio_session=".length);
    const found =
      token && /^[a-f0-9]{64}$/.test(token)
        ? ((await db
            .prepare(
              "SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?",
            )
            .get(digest(token), Date.now())) as
            | {
                user_id: string;
              }
            | undefined)
        : undefined;
    if (found) {
      res.locals.userId = found.user_id;
      res.locals.sessionHash = digest(token!);
    } else await session(res, (await createGuest()).id);
    next();
  });
  async function state(id: string): Promise<AppState> {
    const account = await user(id);
    const preferences: Preferences = {
      ...defaults,
      ...JSON.parse(account.preferences),
    };
    preferences.courseId = getCourse(preferences.courseId).id;
    const everyRun = await allRuns(id);
    const runCourse = (run: Run) =>
      run.courseId ??
      (run.lessonId ? lessonCourse.get(run.lessonId) : undefined) ??
      "en";
    const runs = everyRun.filter(
      (run) => runCourse(run) === preferences.courseId,
    );
    const everyHistory = everyRun
      .flatMap((run) => (run.result ? [run.result] : []))
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const history = everyHistory.filter(
      (result) =>
        (result.courseId ??
          (result.lessonId ? lessonCourse.get(result.lessonId) : undefined) ??
          "en") === preferences.courseId,
    );
    const practiced = (await notions(id)).filter(
      (n) =>
        (exerciseCourse.get(n.exerciseId) ?? "en") === preferences.courseId,
    );
    const allCompleted = [
      ...new Set(everyHistory.flatMap((r) => (r.lessonId ? [r.lessonId] : []))),
    ];
    const today = localDay(new Date(), preferences.timezone);
    const daily = new Map<string, number>();
    for (const result of everyHistory) {
      const day = localDay(new Date(result.completedAt), preferences.timezone);
      daily.set(day, (daily.get(day) ?? 0) + result.minutes);
    }
    const answered = runs.flatMap((run) => run.answers);
    const correct = answered.filter((answer) => answer.correct).length;
    return {
      ai: ai.overview(),
      allCompleted,
      courseProgress: courses.map((course) => ({
        id: course.id,
        completed: allCompleted.filter(
          (id) => lessonCourse.get(id) === course.id,
        ).length,
        total: course.units.reduce((sum, unit) => sum + unit.lessons.length, 0),
      })),
      billing: await billing.overview(id),
      user: {
        id,
        name: account.name,
        email: account.email,
        guest: Boolean(account.guest),
      },
      preferences,
      completed: [
        ...new Set(
          history.flatMap((result) =>
            result.lessonId ? [result.lessonId] : [],
          ),
        ),
      ],
      activeRun: runs.find((run) => !run.result)?.id ?? null,
      notions: practiced,
      history,
      stats: {
        xp: everyHistory.reduce((sum, r) => sum + r.xp, 0),
        streak: computeStreak([...daily.keys()], today),
        todayMinutes: daily.get(today) ?? 0,
        todayXp: everyHistory
          .filter(
            (r) =>
              localDay(new Date(r.completedAt), preferences.timezone) === today,
          )
          .reduce((sum, r) => sum + r.xp, 0),
        learningDays: daily.size,
        accuracy: answered.length
          ? Math.round((correct / answered.length) * 100)
          : 0,
        totalAnswers: answered.length,
        activity: Array.from({ length: 7 }, (_, i) => {
          const date = shiftDay(today, i - 6);
          return { date, minutes: daily.get(date) ?? 0 };
        }),
      },
      review: {
        due: practiced.filter((n) => n.nextReview <= new Date().toISOString())
          .length,
        practiced: practiced.length,
      },
    };
  }
  async function ownedRun(id: string, uid: string): Promise<Run> {
    const row = (await db
      .prepare("SELECT data FROM runs WHERE id = ? AND user_id = ?")
      .get(id, uid)) as
      | {
          data: string;
        }
      | undefined;
    if (!row)
      throw new ApiError(404, "Cette leçon est introuvable pour ce compte.");
    return JSON.parse(row.data);
  }
  function view(run: Run): RunView {
    const full = run.result ? null : runExercise(run, run.cursor);
    let exercise = null;
    if (full) {
      const { answers: _answers, explanation: _explanation, ...safe } = full;
      exercise = safe;
    }
    return {
      ...(run.source ? { source: run.source } : {}),
      courseId:
        run.courseId ??
        (run.lessonId ? lessonCourse.get(run.lessonId) : undefined) ??
        "en",
      id: run.id,
      lessonId: run.lessonId,
      review: run.review,
      title:
        run.source === "ai"
          ? "Votre pratique générée par IA"
          : run.lessonId
            ? lessonById.get(run.lessonId)!.title
            : "Un peu de pratique",
      index: run.cursor,
      total: run.exerciseIds.length,
      exercise,
      feedback: run.answers[run.cursor] ?? null,
      result: run.result,
    };
  }
  app.get("/api/state", async (_req, res) =>
    res.json(await state(res.locals.userId)),
  );
  billing.authenticatedRoutes(app);
  function runExercise(run: Run, index: number): Exercise {
    const id = run.exerciseIds[index];
    const exercise =
      run.exerciseSnapshot?.find((item) => item.id === id) ??
      exerciseById.get(id);
    if (!exercise)
      throw new ApiError(
        404,
        "Le contenu de cet exercice n’est plus disponible.",
      );
    return exercise;
  }
  async function registeredUser(id: string) {
    const account = await user(id);
    if (account.guest)
      throw new ApiError(
        401,
        "Connectez-vous à votre compte pour utiliser cet espace.",
      );
    return account;
  }
  async function premiumUser(id: string) {
    const account = await registeredUser(id);
    await billing.requirePremium(id);
    return account;
  }
  app.get("/api/premium/stats", async (_req, res) => {
    const id = res.locals.userId;
    await premiumUser(id);
    const current = await state(id);
    const today = localDay(new Date(), current.preferences.timezone);
    const selectedRuns = (await allRuns(id)).filter(
      (run) =>
        !run.source &&
        (run.courseId ??
          (run.lessonId ? lessonCourse.get(run.lessonId) : undefined) ??
          "en") === current.preferences.courseId,
    );
    res.json({
      days: Array.from({ length: 30 }, (_, i) => {
        const date = shiftDay(today, i - 29);
        const results = current.history.filter(
          (r) =>
            localDay(new Date(r.completedAt), current.preferences.timezone) ===
            date,
        );
        return {
          date,
          minutes: results.reduce((sum, r) => sum + r.minutes, 0),
          xp: results.reduce((sum, r) => sum + r.xp, 0),
        };
      }),
      completedLessons: current.completed.length,
      units: getCourse(current.preferences.courseId).units.map((unit) => {
        const ids = new Set(
          unit.lessons.flatMap((lesson) => lesson.exercises.map((e) => e.id)),
        );
        const answers = selectedRuns.flatMap((run) =>
          run.answers.filter((_answer, i) => ids.has(run.exerciseIds[i])),
        );
        return {
          id: unit.id,
          title: unit.title,
          answered: answers.length,
          accuracy: answers.length
            ? Math.round(
                (100 * answers.filter((a) => a.correct).length) /
                  answers.length,
              )
            : null,
        };
      }),
    });
  });
  app.get("/api/ai/conversation", async (_req, res) => {
    await registeredUser(res.locals.userId);
    const current = await state(res.locals.userId);
    res.json(
      await ai.conversation(res.locals.userId, current.preferences.courseId),
    );
  });
  app.delete("/api/ai/conversation", async (_req, res) => {
    await registeredUser(res.locals.userId);
    const current = await state(res.locals.userId);
    await transaction(async () => {
      await db
        .prepare("DELETE FROM ai_messages WHERE user_id=? AND course_id=?")
        .run(res.locals.userId, current.preferences.courseId);
      await db
        .prepare(
          "UPDATE ai_requests SET status='cancelled',data=NULL WHERE user_id=? AND kind=?",
        )
        .run(res.locals.userId, `tutor:${current.preferences.courseId}`);
    });
    res.json({ courseId: current.preferences.courseId, messages: [] });
  });
  app.post("/api/ai/tutor", async (req, res) => {
    const { requestId, message } = z
      .object({
        requestId: z.string().uuid(),
        message: z.string().trim().min(1).max(1200),
        consent: z.literal(true),
      })
      .strict()
      .parse(req.body);
    await premiumUser(res.locals.userId);
    const current = await state(res.locals.userId);
    res.json(
      await ai.chat(
        res.locals.userId,
        current.preferences.courseId,
        requestId,
        message,
      ),
    );
  });
  app.post("/api/ai/practice", async (req, res) => {
    z.object({ consent: z.literal(true) })
      .strict()
      .parse(req.body);
    const uid = res.locals.userId;
    await premiumUser(uid);
    const current = await state(uid);
    const day = new Date().toISOString().slice(0, 10);
    const id = await transaction(async () => {
      await db
        .prepare(
          "INSERT INTO ai_daily_practice (user_id,day,course_id,request_id) VALUES (?,?,?,?) ON CONFLICT(user_id,day,course_id) DO NOTHING",
        )
        .run(uid, day, current.preferences.courseId, randomUUID());
      return (
        (await db
          .prepare(
            "SELECT request_id FROM ai_daily_practice WHERE user_id=? AND day=? AND course_id=?",
          )
          .get(uid, day, current.preferences.courseId)) as {
          request_id: string;
        }
      ).request_id;
    });
    const existing = (await allRuns(uid)).find((run) => run.id === id);
    if (existing) return res.json(view(existing));
    const concepts = [...current.notions]
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 8)
      .map((n) => n.concept);
    const exercises = await ai.practice(
      uid,
      current.preferences.courseId,
      id,
      concepts,
    );
    const result = await transaction(async () => {
      const saved = (await allRuns(uid)).find((run) => run.id === id);
      if (saved) return view(saved);
      const run: Run = {
        id,
        userId: uid,
        source: "ai",
        courseId: current.preferences.courseId,
        lessonId: null,
        review: true,
        exerciseSnapshot: exercises,
        exerciseIds: exercises.map((e) => e.id),
        cursor: 0,
        answers: [],
        result: null,
      };
      await saveRun(run);
      return view(run);
    });
    res.status(201).json(result);
  });
  const preferencesSchema = z
    .object({
      level: z.enum(["beginner", "basics"]),
      courseId: z.enum(courseIds),
      goal: z.enum(["travel", "daily", "work"]),
      dailyMinutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
      timezone: z
        .string()
        .max(100)
        .refine((value) => {
          try {
            new Intl.DateTimeFormat("en", { timeZone: value });
            return true;
          } catch {
            return false;
          }
        }, "Fuseau horaire invalide."),
      sound: z.boolean(),
      reducedMotion: z.boolean(),
      onboarded: z.boolean(),
    })
    .partial()
    .strict();
  app.patch("/api/preferences", async (req, res) => {
    let responseStatus = 200;
    const result = await transaction(async () => {
      const changes = preferencesSchema.parse(req.body);
      const account = await user(res.locals.userId);
      await db
        .prepare("UPDATE users SET preferences = ? WHERE id = ?")
        .run(
          JSON.stringify({ ...JSON.parse(account.preferences), ...changes }),
          account.id,
        );
      return await state(account.id);
    });
    res.status(responseStatus).json(result);
  });
  app.post("/api/runs", async (req, res) => {
    let responseStatus = 200;
    const result = await transaction(async () => {
      const { lessonId, mode } = z
        .object({
          lessonId: z.string().optional(),
          mode: z.literal("review").optional(),
        })
        .strict()
        .parse(req.body);
      const uid = res.locals.userId;
      const current = await state(uid);
      if (mode !== "review" && (!lessonId || !lessonById.has(lessonId)))
        throw new ApiError(400, "Choisissez une leçon valide.");
      if (mode !== "review" && !isUnlocked(lessonId!, current.allCompleted))
        throw new ApiError(
          403,
          "Terminez la leçon précédente pour débloquer celle-ci.",
        );
      const existing = (await allRuns(uid)).find(
        (run) =>
          !run.result &&
          run.source !== "ai" &&
          (run.courseId ??
            (run.lessonId ? lessonCourse.get(run.lessonId) : undefined) ??
            "en") ===
            (mode === "review"
              ? current.preferences.courseId
              : lessonCourse.get(lessonId!)) &&
          run.review === (mode === "review") &&
          (mode === "review" || run.lessonId === lessonId),
      );
      if (existing) return view(existing);
      const now = new Date().toISOString();
      const selected =
        mode === "review"
          ? [...current.notions]
              .sort(
                (a, b) =>
                  Number(b.nextReview <= now) - Number(a.nextReview <= now) ||
                  b.errors / b.attempts - a.errors / a.attempts ||
                  a.nextReview.localeCompare(b.nextReview),
              )
              .slice(0, 8)
              .map((n) => n.exerciseId)
          : lessonById.get(lessonId!)!.exercises.map((e) => e.id);
      if (!selected.length)
        throw new ApiError(
          400,
          "Faites une première leçon pour retrouver ici vos mots à réviser.",
        );
      const run: Run = {
        courseId:
          mode === "review"
            ? current.preferences.courseId
            : lessonCourse.get(lessonId!),
        id: randomUUID(),
        userId: uid,
        lessonId: mode === "review" ? null : lessonId!,
        review: mode === "review",
        exerciseIds: selected,
        cursor: 0,
        answers: [],
        result: null,
      };
      await saveRun(run);
      {
        responseStatus = 201;
        return view(run);
      }
    });
    res.status(responseStatus).json(result);
  });
  app.get("/api/runs/:id", async (req, res) =>
    res.json(view(await ownedRun(req.params.id, res.locals.userId))),
  );
  const answerSchema = z.union([
    z.string().max(1000),
    z.array(z.string().max(100)).max(40),
    z.record(z.string().max(1000)),
  ]);
  app.post("/api/runs/:id/answer", async (req, res) => {
    let responseStatus = 200;
    const result = await transaction(async () => {
      const input = z
        .object({ index: z.number().int().min(0).max(7), answer: answerSchema })
        .strict()
        .parse(req.body);
      const run = await ownedRun(req.params.id, res.locals.userId);
      if (run.result || input.index !== run.cursor)
        throw new ApiError(
          409,
          "Cet exercice a déjà avancé. Reprenez la leçon.",
        );
      if (run.answers[run.cursor]) return view(run);
      const exercise = runExercise(run, run.cursor);
      const correct = grade(exercise, input.answer as Answer);
      await transaction(async () => {
        run.answers.push({
          correct,
          expected: expectedAnswer(exercise),
          explanation: exercise.explanation,
          answer: input.answer as Answer,
        });
        await saveRun(run);
        if (run.source === "ai") return;
        const previous = (await notions(run.userId)).find(
          (n) => n.concept === exercise.concept,
        );
        const notion = practiceNotion(previous, exercise, correct, new Date());
        await db
          .prepare(
            "INSERT INTO notions (user_id,concept,data) VALUES (?,?,?) ON CONFLICT(user_id,concept) DO UPDATE SET data=excluded.data",
          )
          .run(run.userId, notion.concept, JSON.stringify(notion));
      });
      return view(run);
    });
    res.status(responseStatus).json(result);
  });
  app.post("/api/runs/:id/next", async (req, res) => {
    let responseStatus = 200;
    const result = await transaction(async () => {
      const { index } = z
        .object({ index: z.number().int().min(0).max(7) })
        .strict()
        .parse(req.body);
      const run = await ownedRun(req.params.id, res.locals.userId);
      if (run.result) return view(run);
      if (index < run.cursor) return view(run);
      if (index !== run.cursor || !run.answers[run.cursor])
        throw new ApiError(409, "Validez votre réponse avant de continuer.");
      await transaction(async () => {
        run.cursor++;
        if (run.cursor === run.exerciseIds.length) {
          const correct = run.answers.filter((answer) => answer.correct).length;
          run.result = {
            ...(run.source ? { source: run.source } : {}),
            courseId:
              run.courseId ??
              (run.lessonId ? lessonCourse.get(run.lessonId) : undefined) ??
              "en",
            runId: run.id,
            lessonId: run.lessonId,
            review: run.review,
            correct,
            total: run.exerciseIds.length,
            xp: (run.review ? 10 : 20) + correct * 5,
            minutes: run.review
              ? Math.max(1, Math.ceil(run.exerciseIds.length / 3))
              : 5,
            completedAt: new Date().toISOString(),
            toReview:
              run.source === "ai"
                ? []
                : [
                    ...new Set(
                      run.answers.flatMap((answer, i) =>
                        answer.correct ? [] : [runExercise(run, i).concept],
                      ),
                    ),
                  ],
          };
        }
        await saveRun(run);
      });
      return view(run);
    });
    res.status(responseStatus).json(result);
  });
  const limits = new Map<
    string,
    {
      count: number;
      reset: number;
    }
  >();
  function rateLimit(req: Request) {
    const key = `${req.ip}:${String(req.body?.email || "").toLowerCase()}`;
    const now = Date.now();
    if (limits.size > 2000)
      for (const [key, entry] of limits)
        if (entry.reset <= now) limits.delete(key);
    const globalKey = `ip:${req.ip}`;
    const global = limits.get(globalKey);
    if (!global || global.reset <= now)
      limits.set(globalKey, { count: 1, reset: now + 900000 });
    else if (++global.count > 60)
      throw new ApiError(429, "Trop de tentatives. Réessayez dans 15 minutes.");
    const entry = limits.get(key);
    if (!entry || entry.reset <= now) {
      limits.set(key, { count: 1, reset: now + 900000 });
      return;
    }
    if (++entry.count > 10)
      throw new ApiError(429, "Trop de tentatives. Réessayez dans 15 minutes.");
  }
  const credentials = z.object({
    email: z
      .string()
      .email("Adresse e-mail invalide.")
      .max(254)
      .transform((s) => s.toLowerCase().trim()),
    password: z.string().min(10, "Utilisez au moins 10 caractères.").max(128),
  });
  app.post("/api/auth/register", async (req, res) => {
    rateLimit(req);
    const input = credentials
      .extend({ name: z.string().trim().min(1).max(40) })
      .strict()
      .parse(req.body);
    const current = await user(res.locals.userId);
    if (!current.guest) throw new ApiError(409, "Vous êtes déjà connecté.");
    if (
      await db.prepare("SELECT id FROM users WHERE email = ?").get(input.email)
    )
      throw new ApiError(
        409,
        "Cette adresse est déjà utilisée. Vous pouvez vous connecter.",
      );
    const salt = randomBytes(16).toString("hex");
    const hash = (await scrypt(input.password, salt, 64)) as Buffer;
    await transaction(async () => {
      if (!(await user(current.id))?.guest)
        throw new ApiError(
          409,
          "Cette session a déjà créé un compte. Rechargez la page.",
        );
      if (
        await db
          .prepare("SELECT id FROM users WHERE email = ?")
          .get(input.email)
      )
        throw new ApiError(409, "Cette adresse est déjà utilisée.");
      await db
        .prepare(
          "UPDATE users SET name=?,email=?,password=?,guest=0 WHERE id=?",
        )
        .run(
          input.name,
          input.email,
          `${salt}:${hash.toString("hex")}`,
          current.id,
        );
      await db.prepare("DELETE FROM sessions WHERE user_id=?").run(current.id);
      await session(res, current.id);
    });
    res.status(201).json(await state(current.id));
  });
  app.post("/api/auth/login", async (req, res) => {
    rateLimit(req);
    const input = credentials.strict().parse(req.body);
    const found = (await db
      .prepare("SELECT * FROM users WHERE email=? AND guest=0")
      .get(input.email)) as UserRow | undefined;
    const [salt, expected] = found?.password?.split(":") ?? [
      "00000000000000000000000000000000",
      "0".repeat(128),
    ];
    const actual = (await scrypt(input.password, salt, 64)) as Buffer;
    if (!found || !timingSafeEqual(actual, Buffer.from(expected, "hex")))
      throw new ApiError(401, "Adresse e-mail ou mot de passe incorrect.");
    await db
      .prepare("DELETE FROM sessions WHERE token=?")
      .run(res.locals.sessionHash);
    await session(res, found.id);
    res.json(await state(found.id));
  });
  app.post("/api/auth/logout", async (_req, res) => {
    let responseStatus = 200;
    const result = await transaction(async () => {
      await db
        .prepare("DELETE FROM sessions WHERE token=?")
        .run(res.locals.sessionHash);
      const guest = await createGuest();
      await session(res, guest.id);
      return await state(guest.id);
    });
    res.status(responseStatus).json(result);
  });
  app.get("/api/account/export", async (_req, res) => {
    const uid = res.locals.userId;
    const current = await state(uid);
    const messages = (await db
      .prepare(
        "SELECT course_id,data FROM ai_messages WHERE user_id=? ORDER BY created_at,rowid",
      )
      .all(uid)) as { course_id: string; data: string }[];
    res.json({
      exportedAt: new Date().toISOString(),
      user: current.user,
      preferences: current.preferences,
      completed: current.allCompleted,
      courseProgress: current.courseProgress,
      notions: await notions(uid),
      history: (await allRuns(uid)).flatMap((run) =>
        run.result ? [run.result] : [],
      ),
      membership: current.billing.membership,
      conversations: courses.map((course) => ({
        courseId: course.id,
        messages: messages
          .filter((row) => row.course_id === course.id)
          .map((row) => JSON.parse(row.data)),
      })),
    });
  });
  app.delete("/api/account", async (req, res) => {
    const account = await user(res.locals.userId);
    if (!account.guest) {
      const { password } = z
        .object({ password: z.string().max(128) })
        .strict()
        .parse(req.body);
      const [salt, expected] = account.password!.split(":");
      const actual = (await scrypt(password, salt, 64)) as Buffer;
      if (!timingSafeEqual(actual, Buffer.from(expected, "hex")))
        throw new ApiError(
          401,
          "Mot de passe incorrect. Le compte n’a pas été supprimé.",
        );
    }
    await billing.removeAccount(account.id);
    await db.prepare("DELETE FROM users WHERE id=?").run(account.id);
    const guest = await createGuest();
    await session(res, guest.id);
    res.json(await state(guest.id));
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Cette action est introuvable." }),
  );
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      // Une transaction refusée ne doit pas remplacer le cookie encore valable.
      res.removeHeader("Set-Cookie");
      if (error instanceof z.ZodError)
        return res
          .status(400)
          .json({ error: error.issues[0]?.message || "Données invalides." });
      if (error instanceof ApiError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof BillingError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof AiError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof SyntaxError)
        return res
          .status(400)
          .json({ error: "Le format de la requête est invalide." });
      console.error(
        "Erreur serveur Parlio :",
        error instanceof Error ? error.name : "erreur inconnue",
      );
      res.status(500).json({
        error:
          "La sauvegarde est momentanément indisponible. Réessayez sans fermer la leçon.",
      });
    },
  );
  return { app, db, close: () => db.close() };
}
