import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("l’accueil présente les trois langues et un véritable aperçu sans attribuer de points", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "De nouveaux mots.",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".site-language-card")).toHaveCount(3);
  await expect(page.locator(".site-pricing-grid")).toContainText("10,99 €");
  await expect(page.locator(".pricing-disclaimer")).toContainText("69,99 €");
  await page
    .getByRole("group", { name: "Langue de l’aperçu" })
    .getByRole("button", { name: "Allemand" })
    .click();
  await expect(page.locator(".sample-word")).toContainText("Hallo");
  await page
    .getByRole("group", { name: "Traduction dans cet aperçu" })
    .getByRole("button", { name: "Bonjour" })
    .click();
  await page.getByRole("button", { name: "Vérifier", exact: true }).click();
  await expect(page.locator(".sample-feedback")).toContainText(
    "Le début d’une conversation.",
  );
  const state = await page.request.get("/api/state");
  expect((await state.json()).stats.xp).toBe(0);
  await page.getByRole("button", { name: "Apprendre l’allemand" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("button", { name: "C’est parti !", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hallo");
  await expect(
    page.getByRole("navigation", { name: "Menu des modes de jeu" }),
  ).toBeVisible();
  await expect(page.locator(".quest-count")).toHaveText("0/3");
  await expect(
    page.getByRole("button", { name: "Langue apprise : allemand" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Commencer la leçon", exact: true })
    .click();
  await page.locator(".answer-option").filter({ hasText: "Bonjour" }).click();
  await page.getByRole("button", { name: "Vérifier ma réponse" }).click();
  await expect(page.locator(".exercise-feedback")).toContainText("Hallo");
  await page.reload();
  await expect(page.locator(".exercise-feedback")).toContainText("Hallo");
  await page.getByRole("button", { name: "Langue apprise : allemand" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Anglais Débutant/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello");
  await page.getByRole("button", { name: "Langue apprise : anglais" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Allemand Débutant/ })
    .click();
  await page.getByRole("button", { name: "Reprendre ma leçon" }).click();
  await expect(page.locator(".exercise-feedback")).toContainText("Hallo");
});

test("le menu de jeu permet de naviguer et de changer de monde sur mobile au clavier", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#today");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("button", { name: "C’est parti !", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apprendre l’espagnol", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hola");
  await page
    .getByRole("navigation", { name: "Menu des modes de jeu" })
    .getByRole("link", { name: /Carte de l’aventure/ })
    .click();
  await expect(page.locator(".game-map .path-unit")).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: "Commencer ¡Hola, vous !", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Verrouillée : Enchanté !", exact: true }),
  ).toBeDisabled();
  const menu = page.getByRole("button", {
    name: "Ouvrir le menu",
    exact: true,
  });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    page
      .locator("#player-menu")
      .getByRole("button", { name: "Fermer le menu", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mes révisions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Un carnet encore tout neuf." }),
  ).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("l’accueil, le choix des langues et les espaces IA et Premium sont accessibles sur ordinateur et mobile", async ({
  page,
}) => {
  test.setTimeout(120000);
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".site-hero")).toBeVisible();
  await audit();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await audit();
  }
  await page.getByRole("button", { name: "Découvrir l’atelier" }).click();
  await expect(
    page.getByRole("heading", { name: "L’atelier se prépare." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Envoyer", exact: true }),
  ).toBeDisabled();
  await audit();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/#premium");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Votre abonnement Parlio",
  );
  await expect(
    page.getByRole("button", { name: "Paiement à configurer" }),
  ).toBeDisabled();
  await expect(page.getByText("Abonnements en préparation")).toBeVisible();
  await audit();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/#insights");
  await expect(
    page.getByRole("heading", { name: "Un regard plus précis." }),
  ).toBeVisible();
  await audit();
});
