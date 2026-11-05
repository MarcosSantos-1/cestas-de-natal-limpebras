import { test, expect } from "@playwright/test";
test("conta não cria rolagem horizontal no painel nem no documento", async ({
  page,
  request,
}) => {
  expect(await (await request.get("/")).text()).toContain("teste local");
  await page.goto("/admin");
  await page.getByLabel("E-mail ou matrícula").fill("rh@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("TesteLocal123!");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(
    page.getByRole("heading", { name: "Vamos entregar um bom Natal." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Minha conta", exact: true }).click();
  for (const viewport of [
    { width: 320, height: 640 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".profile-card h2")).toBeVisible();
    await page.waitForTimeout(300);
    const sizes = await page.evaluate(() => {
      const main = document.querySelector(".admin-stage")!;
      const card = document.querySelector(".profile-card")!;
      return {
        page: document.documentElement.scrollWidth - innerWidth,
        panel: main.scrollWidth - main.clientWidth,
        card: card.scrollWidth - card.clientWidth,
      };
    });
    expect
      .soft(sizes, JSON.stringify(viewport))
      .toEqual({ page: 0, panel: 0, card: 0 });
  }
});
