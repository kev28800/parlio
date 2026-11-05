import test from "node:test";
import assert from "node:assert/strict";
import { course, lessons, exercises, isUnlocked } from "../shared/course";
import {
  computeStreak,
  grade,
  localDay,
  normalizeAnswer,
  practiceNotion,
} from "../shared/learning";

test("le parcours comprend 6 unités, 18 leçons et 144 exercices cohérents", () => {
  assert.equal(course.length, 6);
  assert.equal(lessons.length, 18);
  assert.equal(exercises.length, 144);
  assert.equal(new Set(exercises.map((e) => e.id)).size, 144);
  assert.deepEqual(
    new Set(exercises.map((e) => e.type)),
    new Set(["choice", "pairs", "arrange", "fill", "write", "listen"]),
  );
  for (const unit of course) {
    assert.equal(unit.lessons.length, 3);
    for (const lesson of unit.lessons) assert.equal(lesson.exercises.length, 8);
  }
  for (const e of exercises) {
    assert.ok(e.explanation.length > 20, e.id);
    if (e.type === "pairs") {
      assert.equal(e.pairs!.length, 3);
      const pairs = Object.fromEntries(e.pairs!.map((p) => [p.left, p.right]));
      assert.ok(grade(e, pairs), e.id);
      assert.ok(!grade(e, {}));
      assert.equal(new Set(e.pairs!.map((p) => p.right)).size, 3);
    } else {
      assert.ok(e.answers.length > 0, e.id);
      for (const answer of e.answers) {
        assert.ok(grade(e, answer), `${e.id}: ${answer}`);
        assert.ok(grade(e, `  ${answer.toUpperCase()} !  `), e.id);
      }
      assert.ok(!grade(e, "a completely different meaning"), e.id);
    }
    if (e.options) {
      assert.equal(
        new Set(e.options.map(normalizeAnswer)).size,
        e.options.length,
        e.id,
      );
      assert.equal(e.options.filter((o) => grade(e, o)).length, 1, e.id);
    }
    if (e.type === "arrange")
      assert.deepEqual(
        [...e.words!].sort(),
        e.answers[0].split(" ").sort(),
        e.id,
      );
    if (e.type === "listen") assert.ok(e.transcript?.length, e.id);
  }
});
test("la correction accepte les variantes explicites et refuse les changements de sens", () => {
  const e = exercises.find((e) => e.id === "u1-l1-8")!;
  assert.ok(grade(e, "  I’M    ALEX!!!  "));
  assert.ok(grade(e, "I am Alex."));
  assert.ok(!grade(e, "I am not Alex"));
  assert.ok(!grade(e, "You are Alex"));
  assert.ok(!grade(e, "I am Sam"));
  assert.equal(normalizeAnswer(" THANK   YOU! "), "thank you");
});
test("les leçons sont débloquées progressivement", () => {
  assert.ok(isUnlocked("u1-l1", []));
  assert.ok(!isUnlocked("u1-l2", []));
  assert.ok(isUnlocked("u1-l2", ["u1-l1"]));
  assert.ok(!isUnlocked("invented", []));
});
test("une erreur rapproche la révision ; les réussites immédiates n’allongent pas l’intervalle", () => {
  const e = exercises[0];
  const start = new Date("2026-11-01T12:00:00Z");
  const first = practiceNotion(undefined, e, true, start);
  assert.equal(first.interval, 1);
  assert.equal(first.streak, 1);
  const repeated = practiceNotion(
    first,
    e,
    true,
    new Date("2026-11-01T12:02:00Z"),
  );
  assert.equal(repeated.interval, 1);
  assert.equal(repeated.streak, 1);
  const spaced = practiceNotion(
    repeated,
    e,
    true,
    new Date("2026-11-02T12:05:00Z"),
  );
  assert.equal(spaced.interval, 3);
  const failed = practiceNotion(
    spaced,
    e,
    false,
    new Date("2026-11-02T12:10:00Z"),
  );
  assert.equal(failed.nextReview, "2026-11-02T12:20:00.000Z");
  assert.equal(failed.streak, 0);
  assert.equal(failed.attempts, 4);
  assert.equal(failed.errors, 1);
});
test("les jours et séries suivent le fuseau utilisateur, y compris le changement de date", () => {
  const instant = new Date("2026-11-05T23:30:00Z");
  assert.equal(localDay(instant, "Europe/Paris"), "2026-11-06");
  assert.equal(localDay(instant, "America/Montreal"), "2026-11-05");
  assert.equal(
    computeStreak(["2026-11-03", "2026-11-04", "2026-11-05"], "2026-11-05"),
    3,
  );
  assert.equal(computeStreak(["2026-11-03", "2026-11-04"], "2026-11-05"), 2);
  assert.equal(computeStreak(["2026-11-03"], "2026-11-05"), 0);
  assert.equal(
    localDay(new Date("2026-10-25T01:30:00Z"), "Europe/Paris"),
    "2026-10-25",
  );
});
