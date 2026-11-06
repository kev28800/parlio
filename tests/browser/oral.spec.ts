import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function voices(page: Page, supported = true) {
  await page.addInitScript(
    ({ supported }) => {
      const browser = window as any;
      browser.__voice = {
        starts: 0,
        aborts: 0,
        spoken: [] as any[],
        autoStart: true,
      };
      let utterance: any;
      let recognition: any;
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () =>
            supported
              ? ["en-GB", "es-ES", "de-DE"].map((lang) => ({
                  lang,
                  name: `Fixture ${lang}`,
                  localService: true,
                }))
              : [],
          addEventListener() {},
          removeEventListener() {},
          cancel() {
            utterance = null;
          },
          speak(value: any) {
            utterance = value;
            browser.__voice.spoken.push({ text: value.text, lang: value.lang });
            if (browser.__voice.autoStart) value.onstart?.();
          },
        },
      });
      browser.SpeechSynthesisUtterance = class {
        constructor(public text: string) {}
      };
      const FakeRecognition = class {
        lang = "";
        onstart?: () => void;
        onend?: () => void;
        onerror?: (value: any) => void;
        onresult?: (value: any) => void;
        start() {
          recognition = this;
          browser.__voice.starts++;
          browser.__voice.detectedLang = this.lang;
          this.onstart?.();
        }
        stop() {
          this.onend?.();
        }
        abort() {
          browser.__voice.aborts++;
          this.onend?.();
        }
      };
      browser.SpeechRecognition = supported ? FakeRecognition : undefined;
      browser.webkitSpeechRecognition = undefined;
      browser.__finishVoice = (text: string) => {
        recognition?.onresult?.({
          results: [{ isFinal: true, 0: { transcript: text } }],
        });
        recognition?.onend?.();
      };
      browser.__denyVoice = () =>
        recognition?.onerror?.({ error: "not-allowed" });
      browser.__endSpeech = () => utterance?.onend?.();
      browser.__beginSpeech = () => utterance?.onstart?.();
      browser.__boundary = (charIndex: number) =>
        utterance?.onboundary?.({ charIndex, name: "word" });
      browser.__pauseSpeech = () => utterance?.onpause?.();
      browser.__resumeSpeech = () => utterance?.onresume?.();
      browser.__failSpeech = () =>
        utterance?.onerror?.({ error: "synthesis-failed" });
    },
    { supported },
  );
}

test("Pip lit la bonne langue et ne démarre le micro qu’après consentement et clic ; le mode guidé n’appelle pas l’IA", async ({
  page,
}) => {
  await voices(page);
  let aiCalls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/ai/tutor")) aiCalls++;
  });
  await page.goto("/#tutor");
  await expect(
    page.getByRole("heading", { name: "Et si on se parlait ?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: /Pip, votre renard animé/ }),
  ).toBeVisible();
  await expect(page.locator(".pip-interactive")).toHaveAttribute(
    "data-renderer",
    /3d|2d/,
  );
  expect(await page.evaluate(() => (window as any).__voice.starts)).toBe(0);
  await expect(
    page.getByRole("button", { name: "Parler à Pip", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  await expect(page.locator(".pip-stage")).toHaveClass(/pip-speaking/);
  expect(await page.evaluate(() => (window as any).__voice.spoken[0])).toEqual({
    text: "Hello",
    lang: "en-GB",
  });
  await page
    .getByRole("checkbox", { name: /J’accepte la dictée vocale/ })
    .check();
  await page.getByRole("button", { name: "Parler à Pip", exact: true }).click();
  await expect(page.locator(".pip-stage")).toHaveClass(/pip-listening/);
  expect(await page.evaluate(() => (window as any).__voice.detectedLang)).toBe(
    "en-GB",
  );
  await expect(page.locator(".pip-stage")).not.toHaveClass(/pip-speaking/);
  await page.evaluate(() => (window as any).__finishVoice("Hello"));
  await expect(
    page.getByLabel("Votre transcription ou votre texte"),
  ).toHaveValue("Hello");
  await page.getByRole("button", { name: "Comparer les textes" }).click();
  await expect(page.locator(".oral-comparison")).toContainText(
    "correspond au modèle",
  );
  await expect(page.locator(".oral-comparison")).toContainText(
    "n’évalue pas votre prononciation",
  );
  await page.getByRole("button", { name: "Phrase suivante" }).click();
  await expect(
    page.getByLabel("Votre transcription ou votre texte"),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Langue apprise : anglais" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Espagnol Débutant/ })
    .click();
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).__voice.spoken.at(-1)),
  ).toEqual({ text: "Hola", lang: "es-ES" });
  await page.getByRole("button", { name: "Langue apprise : espagnol" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Allemand Débutant/ })
    .click();
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  expect(
    await page.evaluate(() => (window as any).__voice.spoken.at(-1)),
  ).toEqual({ text: "Hallo", lang: "de-DE" });
  const state = await (await page.request.get("/api/state")).json();
  expect(state.stats.xp).toBe(0);
  expect(aiCalls).toBe(0);
});

test("le refus du micro laisse le clavier utilisable ; la limite de durée et la navigation arrêtent la dictée", async ({
  page,
}) => {
  await voices(page);
  await page.goto("/#tutor");
  await page.clock.install();
  await page
    .getByRole("checkbox", { name: /J’accepte la dictée vocale/ })
    .check();
  await page.getByRole("button", { name: "Parler à Pip", exact: true }).click();
  await page.evaluate(() => (window as any).__denyVoice());
  await expect(page.getByRole("alert")).toContainText("micro a été refusé");
  await page.getByRole("button", { name: "Utiliser le clavier" }).click();
  await expect(
    page.getByLabel("Votre transcription ou votre texte"),
  ).toBeFocused();
  await page.getByLabel("Votre transcription ou votre texte").fill("Hello");
  await page.getByRole("button", { name: "Comparer les textes" }).click();
  await expect(page.locator(".oral-comparison")).toContainText(
    "correspond au modèle",
  );
  await page.getByRole("button", { name: "Parler à Pip", exact: true }).click();
  const beforeTimeout = await page.evaluate(
    () => (window as any).__voice.aborts,
  );
  await page.clock.fastForward(21000);
  await expect(page.getByRole("alert")).toContainText("20 secondes");
  expect(
    await page.evaluate(() => (window as any).__voice.aborts),
  ).toBeGreaterThan(beforeTimeout);
  await expect(page.locator(".pip-stage")).not.toHaveClass(/pip-listening/);
  await page.getByRole("button", { name: "Parler à Pip", exact: true }).click();
  const count = await page.evaluate(() => (window as any).__voice.aborts);
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mon bilan", exact: true })
    .click();
  expect(
    await page.evaluate(() => (window as any).__voice.aborts),
  ).toBeGreaterThan(count);
});

test("Pip sans service vocal propose le texte et reste accessible jusqu’à 320 px", async ({
  page,
}) => {
  test.setTimeout(90000);
  await voices(page, false);
  await page.goto("/#tutor");
  await expect(
    page.getByRole("button", { name: "Écouter Pip", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "La dictée n’est pas disponible dans ce navigateur. Utilisez le clavier pour continuer.",
    ),
  ).toBeVisible();
  await page.getByLabel("Votre transcription ou votre texte").fill("Hello");
  await page.getByRole("button", { name: "Comparer les textes" }).click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("une transcription IA est relue puis envoyée explicitement ; Pip lit la réponse textuelle simulée", async ({
  page,
}) => {
  await voices(page);
  await page.route("**/api/state", async (route) => {
    const response = await route.fetch();
    const state = await response.json();
    state.user.guest = false;
    state.preferences.onboarded = true;
    state.ai.configured = true;
    state.billing.membership.premium = true;
    await route.fulfill({ json: state });
  });
  await page.route("**/api/ai/conversation", (route) =>
    route.fulfill({ json: { courseId: "en", messages: [] } }),
  );
  let sent = 0;
  await page.route("**/api/ai/tutor", async (route) => {
    sent++;
    const body = route.request().postDataJSON();
    expect(body.message).toBe("Hello Pip");
    expect(body.consent).toBe(true);
    await route.fulfill({
      json: {
        courseId: "en",
        messages: [
          { id: "learner", role: "user", text: body.message },
          {
            id: "pip",
            role: "assistant",
            text: "Bonjour ! Voici une réponse de test.",
            nextPrompt: "How are you?",
            spokenText: "Hello! How are you?",
          },
        ],
      },
    });
  });
  await page.goto("/#tutor");
  await page
    .getByRole("button", { name: "Conversation IA", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /J’accepte la dictée vocale/ })
    .check();
  await page.getByRole("button", { name: "Parler à Pip", exact: true }).click();
  await page.evaluate(() => (window as any).__finishVoice("Hello Pip"));
  await expect(page.getByLabel("Votre message", { exact: true })).toHaveValue(
    "Hello Pip",
  );
  await page.getByLabel("Votre message", { exact: true }).fill("Hello Pip!");
  await expect(
    page.getByLabel("Votre message à relire avant envoi"),
  ).toHaveValue("Hello Pip!");
  await page.getByLabel("Votre message à relire avant envoi").fill("Hello Pip");
  expect(sent).toBe(0);
  await page
    .getByRole("checkbox", { name: /J’accepte l’envoi de mes messages/ })
    .check();
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  await expect(page.locator(".tutor-spoken")).toHaveText("Hello! How are you?");
  await expect(
    page.getByLabel("Votre message à relire avant envoi"),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Écouter avec Pip" }).click();
  await expect(page.locator(".pip-stage")).toHaveClass(/pip-speaking/);
  expect(
    await page.evaluate(() => (window as any).__voice.spoken.at(-1)),
  ).toEqual({ text: "Hello! How are you?", lang: "en-GB" });
  expect(sent).toBe(1);
});

test("le renard 3D articule seulement pendant la voix, réagit au coucou et respecte la pause", async ({
  page,
}) => {
  await voices(page);
  await page.goto("/#tutor");
  const pip = page.locator(".pip-interactive");
  await expect(pip).toHaveAttribute("data-renderer", "3d");
  await expect(pip.locator("canvas")).toBeVisible();
  await page.evaluate(() => {
    (window as any).__voice.autoStart = false;
  });
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  await expect(pip).toHaveAttribute("data-mouth", "0.000");
  await expect(page.locator(".pip-stage")).not.toHaveClass(/pip-speaking/);
  await page.evaluate(() => (window as any).__beginSpeech());
  await expect(page.locator(".pip-stage")).toHaveClass(/pip-speaking/);
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeGreaterThan(0.12);
  // A voice without word events must keep articulating until it actually stops.
  await page.waitForTimeout(800);
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeGreaterThan(0.12);
  await page.evaluate(() => (window as any).__pauseSpeech());
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeLessThan(0.02);
  await page.evaluate(() => {
    (window as any).__resumeSpeech();
    (window as any).__boundary(1);
  });
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeGreaterThan(0.12);
  await page.evaluate(() => (window as any).__endSpeech());
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeLessThan(0.02);
  await page.getByRole("button", { name: "Faire coucou", exact: true }).click();
  await expect(pip).toHaveAttribute("data-gesture", "wave");
  await page
    .getByRole("button", { name: "Mettre les animations de Pip en pause" })
    .click();
  await expect(pip).toHaveAttribute("data-animations", "paused");
  await expect(pip).toHaveAttribute("data-mouth", "0.000");
  await expect(
    page.getByRole("button", { name: "Faire coucou", exact: true }),
  ).toBeDisabled();
  const still = await pip.screenshot();
  await page.waitForTimeout(200);
  expect((await pip.screenshot()).equals(still)).toBe(true);
  await page
    .getByRole("button", { name: "Reprendre les animations de Pip" })
    .click();
  await expect(pip).toHaveAttribute("data-animations", "playing");
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  await page.evaluate(() => {
    (window as any).__beginSpeech();
    (window as any).__boundary(1);
  });
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeGreaterThan(0.12);
  await page.evaluate(() => (window as any).__failSpeech());
  await expect(page.getByRole("alert")).toContainText("La lecture a échoué");
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeLessThan(0.02);
  await page.evaluate(() => (window as any).__beginSpeech());
  await expect(page.locator(".pip-stage")).not.toHaveClass(/pip-speaking/);
  expect(await page.evaluate(() => (window as any).__voice.starts)).toBe(0);
});

test("sans WebGL Pip reste animé ; la réduction des mouvements fige aussi le personnage", async ({
  page,
}) => {
  await voices(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: any[]
    ) {
      if (type.startsWith("webgl") || type === "experimental-webgl")
        return null;
      return (original as any).call(this, type, ...args);
    } as typeof original;
  });
  await page.goto("/#tutor");
  const pip = page.locator(".pip-interactive");
  await expect(pip).toHaveAttribute("data-renderer", "2d");
  await expect(pip.locator("svg")).toBeVisible();
  await page.getByRole("button", { name: "Faire coucou", exact: true }).click();
  await expect(pip).toHaveAttribute("data-gesture", "wave");
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeGreaterThan(0.12);
  await page.evaluate(() => (window as any).__endSpeech());
  await expect
    .poll(async () => Number(await pip.getAttribute("data-mouth")))
    .toBeLessThan(0.02);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(pip).toHaveAttribute("data-animations", "paused");
  await expect(
    page.getByRole("button", { name: "Faire coucou", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Écouter Pip", exact: true }).click();
  await expect(page.locator(".pip-stage")).toHaveClass(/pip-speaking/);
  await expect(pip).toHaveAttribute("data-mouth", "0.000");
  await page.getByRole("button", { name: "Arrêter la lecture" }).click();
  await expect(page.locator(".pip-stage")).not.toHaveClass(/pip-speaking/);
});
