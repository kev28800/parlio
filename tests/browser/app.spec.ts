import { test, expect, type Page } from "@playwright/test";
import { lessonById } from "../../shared/course";
import AxeBuilder from "@axe-core/playwright";
async function onboarding(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("button", { name: "C’est parti !", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
test("le serveur web ne donne pas accès à la base ni au code serveur", async ({
  request,
}) => {
  for (const path of [
    "/server/app.ts",
    "/@fs/workspace/parlio/server/app.ts",
    "/@fs/tmp/parlio-browser-tests.sqlite",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(403);
  }
});
test("une leçon complète, six formats, erreur, reprise, compte et persistance", async ({
  page,
}) => {
  await onboarding(page);
  await page
    .getByRole("button", { name: "Commencer la leçon", exact: true })
    .click();
  const content = lessonById.get("u1-l1")!;
  for (let i = 0; i < 8; i++) {
    const e = content.exercises[i];
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      e.instruction,
    );
    if (i < 6) {
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        accessibility.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
    }
    if (e.type === "choice" || e.type === "listen") {
      if (e.type === "listen")
        await expect(page.locator(".audio-fallback")).toBeVisible();
      await page
        .locator(".answer-option")
        .filter({ hasText: i === 0 ? "Au revoir" : e.answers[0] })
        .click();
    } else if (e.type === "pairs") {
      for (const pair of e.pairs!) {
        await page
          .getByRole("button", { name: pair.left, exact: true })
          .click();
        await page
          .locator(".pair-columns>div")
          .nth(1)
          .getByRole("button", { name: new RegExp(pair.right) })
          .click();
      }
    } else if (e.type === "arrange") {
      for (const word of e.answers[0].split(" "))
        await page
          .locator(".word-bank")
          .getByRole("button", { name: word, exact: true })
          .first()
          .click();
    } else
      await page.getByRole("textbox").fill(e.answers[0].toUpperCase() + "!");
    await page.getByRole("button", { name: "Vérifier ma réponse" }).click();
    await expect(page.locator(".exercise-feedback")).toBeVisible();
    if (i === 0) {
      await expect(page.locator(".exercise-feedback")).toContainText(
        "La réponse : Bonjour",
      );
      await page.reload();
      await expect(page.locator(".exercise-feedback")).toContainText(
        "La réponse : Bonjour",
      );
    }
    await page
      .getByRole("button", {
        name: i === 7 ? "Voir mon bilan" : "Continuer",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "Bravo d’être allé au bout." }),
  ).toBeVisible();
  await expect(page.locator(".result-stats")).toContainText("+55");
  await page.reload();
  await expect(page.locator(".result-stats")).toContainText("+55");
  await expect(
    page.getByRole("button", { name: "55 points d’expérience" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Conserver mes progrès" }).click();
  await page.getByLabel("Votre prénom").fill("Camille");
  await page
    .getByLabel("Votre adresse e-mail")
    .fill(`camille-${Date.now()}@example.test`);
  await page.getByLabel("Votre mot de passe").fill("long-secure-password-123");
  await page
    .getByRole("button", { name: "Créer mon compte gratuit", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "55 points d’expérience" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revenir à l’accueil" }).click();
  await expect(
    page.getByRole("heading", { name: /Hello, Camille/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mon parcours" })
    .click();
  await expect(
    page.getByRole("button", { name: "Commencer Enchanté !" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /Verrouillée : Ça va bien/ }),
  ).toBeDisabled();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mes révisions" })
    .click();
  await expect(page.locator(".notion-row").first()).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
test("affichage mobile, parcours, révisions vides et réglages accessibles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await onboarding(page);
  for (const [name, heading] of [
    ["parcours", "Un mot après l’autre"],
    ["révisions", "Les mots restent"],
    ["profil", "Votre petit espace"],
  ] as const) {
    await page
      .getByRole("navigation", { name: "Navigation mobile" })
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heading,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  const toggle = page.getByRole("switch", { name: "Limiter les animations" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Limiter les animations" }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("navigation", { name: "Navigation mobile" })
    .getByRole("link", { name: "révisions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Un carnet encore tout neuf." }),
  ).toBeVisible();
});
test("contrôles WCAG automatisés et absence de débordement à 320 px", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  async function audit() {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
  await audit();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await audit();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await audit();
  await page
    .getByRole("button", { name: "C’est parti !", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await audit();
  for (const name of ["Mon parcours", "Mes révisions", "Mon profil"]) {
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name, exact: true })
      .click();
    await audit();
  }
  await page
    .getByRole("button", { name: "Créer un compte gratuit", exact: true })
    .click();
  await audit();
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: "Parlio Premium" }).click();
  await audit();
  await page.getByRole("button", { name: "Continuer gratuitement" }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  for (const name of ["Aujourd’hui", "parcours", "révisions", "profil"]) {
    await page
      .getByRole("navigation", { name: "Navigation mobile" })
      .getByRole("link", { name, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("une connexion interrompue propose de réessayer", async ({ page }) => {
  await page.route("**/api/state", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "On se reconnecte ?" }),
  ).toBeVisible();
  await page.unroute("**/api/state");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
