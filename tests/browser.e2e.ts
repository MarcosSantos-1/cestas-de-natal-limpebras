import { test, expect, Page } from "@playwright/test";
import { parseDate } from "@internationalized/date";
import { todayBrazil, formatDay } from "../src/lib/domain";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
test.beforeEach(async ({ request }) => {
  const response = await request.get("/");
  expect(await response.text()).toContain("teste local");
});
async function begin(page: Page, name = "João da Silva", cpf = "52998224725") {
  await page.goto("/");
  await page.getByRole("button", { name: "Retirar minha cesta" }).click();
  await page.getByLabel("Nome completo", { exact: true }).fill(name);
  await page.getByLabel("CPF", { exact: true }).fill(cpf);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
}
async function login(page: Page) {
  await page.goto("/admin");
  await page.getByLabel("E-mail ou matrícula").fill("rh@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("TesteLocal123!");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(
    page.getByRole("heading", { name: "Vamos entregar um bom Natal." }),
  ).toBeVisible();
}
async function fits(page: Page) {
  await page.waitForTimeout(320);
  const result = await page.evaluate(() => {
    const app = document.querySelector(".app-viewport")!,
      stage = document.querySelector(".public-stage,.check-stage")!;
    return {
      page: document.documentElement.scrollHeight <= window.innerHeight + 1,
      horizontal: document.documentElement.scrollWidth <= window.innerWidth,
      content: stage.scrollHeight <= stage.clientHeight + 2,
      app: app.getBoundingClientRect().bottom <= window.innerHeight + 1,
    };
  });
  expect(result).toEqual({
    page: true,
    horizontal: true,
    content: true,
    app: true,
  });
}
async function shortPhone(page: Page) {
  const previous = page.viewportSize()!;
  await page.setViewportSize({ width: 360, height: 640 });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const stage = document.querySelector(".public-stage,.check-stage")!;
    return {
      title: document.querySelector("h1")?.textContent,
      excess: stage.scrollHeight - stage.clientHeight,
    };
  });
  expect
    .soft(result.excess, `${result.title} em 360×640`)
    .toBeLessThanOrEqual(2);
  await page.setViewportSize(previous);
}
test("passos públicos e entrega pelo RH com conferência separada", async ({
  browser,
}) => {
  const employee = await browser.newPage({
      viewport: { width: 390, height: 844 },
    }),
    admin = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  employee.on("pageerror", (e) => errors.push(e.message));
  admin.on("pageerror", (e) => errors.push(e.message));
  await employee.goto("/");
  await expect(employee.getByLabel("CPF", { exact: true })).toHaveCount(0);
  await employee.screenshot({ path: "test-results/welcome-mobile.png" });
  await employee.getByRole("button", { name: "Retirar minha cesta" }).click();
  await employee
    .getByLabel("Nome completo", { exact: true })
    .fill("João da Silva");
  await employee.getByLabel("CPF", { exact: true }).fill("52998224725");
  await fits(employee);
  await employee.screenshot({ path: "test-results/identity-mobile.png" });
  await employee
    .getByRole("button", { name: "Continuar", exact: true })
    .click();
  await expect(
    employee.getByRole("heading", { name: "Sua cesta está esperando." }),
  ).toBeVisible();
  await fits(employee);
  await employee
    .getByRole("button", { name: "Retirar agora", exact: false })
    .click();
  await expect(employee.locator(".ticket-code")).toHaveText(/^[A-Z]{2}-\d{4}$/);
  const code = await employee.locator(".ticket-code").innerText();
  await fits(employee);
  await shortPhone(employee);
  await employee.screenshot({ path: "test-results/ticket-mobile.png" });
  await login(admin);
  await fits(admin);
  await shortPhone(admin);
  await admin.screenshot({ path: "test-results/admin-mobile.png" });
  await admin.getByLabel("Ou digite o código").fill(code);
  await admin
    .getByRole("button", { name: "Conferir código", exact: true })
    .click();
  await expect(
    admin.getByRole("heading", { name: "João da Silva", exact: true }),
  ).toBeVisible();
  await expect(
    admin.getByRole("button", { name: "Ler QR code", exact: false }),
  ).toHaveCount(0);
  await fits(admin);
  await shortPhone(admin);
  await expect(
    admin.getByRole("button", { name: "Confirmar cesta entregue" }),
  ).toBeDisabled();
  await admin
    .getByText("Conferi a identificação e a assinatura.", { exact: true })
    .click();
  await expect(admin.getByRole("checkbox")).toBeChecked();
  await admin.screenshot({ path: "test-results/conference-mobile.png" });
  await admin.getByRole("button", { name: "Confirmar cesta entregue" }).click();
  await expect(
    admin.getByRole("heading", { name: "Mais uma cesta. Mais um Natal." }),
  ).toBeVisible();
  await fits(admin);
  await shortPhone(admin);
  await employee.getByRole("button", { name: "Atualizar situação" }).click();
  await expect(
    employee.getByRole("heading", { name: "Sua cesta foi entregue." }),
  ).toBeVisible();
  await expect(employee.getByText("Marcos V. A. Santos (2550)")).toBeVisible();
  await fits(employee);
  await shortPhone(employee);
  await admin
    .getByRole("button", { name: "Colaboradores", exact: true })
    .click();
  await expect(
    admin.getByRole("button", { name: /João da Silva/ }),
  ).toBeVisible();
  const [download] = await Promise.all([
    admin.waitForEvent("download"),
    admin.getByRole("button", { name: "Exportar Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("cestas-natal.xlsx");
  expect(errors).toEqual([]);
  await employee.close();
  await admin.close();
});
test("calendário HeroUI, cancelamento em dialog e bloqueio de inativo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page, "Maria de Souza", "11144477735");
  await page.getByRole("button", { name: "Agendar retirada" }).click();
  await page.getByRole("button", { name: "Abrir calendário" }).click();
  const calendar = page.getByRole("dialog");
  const target = parseDate(todayBrazil()).add({ months: 2 }).set({ day: 25 });
  await calendar.getByRole("button", { name: "Próximo mês" }).click();
  await calendar.getByRole("button", { name: "Próximo mês" }).click();
  await calendar
    .getByRole("button", { name: new RegExp(`25.*${target.year}`) })
    .click();
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();
  await expect(
    page.getByText("Retirada agendada", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(formatDay(target.toString()), { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancelar pedido ou reagendar" })
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByRole("heading", { name: "Cancelar este pedido?" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Sim, cancelar" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua cesta está esperando." }),
  ).toBeVisible();
  await begin(page, "Ana Oliveira", "39053344705");
  await expect(
    page.getByRole("heading", { name: "Fale com o RH." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retirar agora" })).toHaveCount(
    0,
  );
  await fits(page);
});
test("importação das três colunas, prévia e preservação da entrega", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page
    .getByRole("button", { name: "Colaboradores", exact: true })
    .click();
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalido.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Matricula;Nome;CPF\n9999;Fulano;123"),
  });
  await expect(
    page.getByText("Corrija 1 erro(s) e envie novamente."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar importação" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Escolher outra planilha" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "base.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Matricula;Nome;CPF\n1001;João da Silva;52998224725"),
  });
  await expect(
    page.getByRole("heading", { name: "Conferir planilha" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar importação" }).click();
  await expect(
    page.getByText("Entregas preservadas.", { exact: false }),
  ).toBeVisible();
  const row = page.getByRole("button", { name: /João da Silva/ });
  await expect(row.getByText("Entregue", { exact: true })).toBeVisible();
  await row.click();
  await page
    .getByRole("button", { name: "Inativar colaborador", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Sim, inativar" })
    .click();
  await expect(page.getByText("Cadastro atualizado.")).toBeVisible();
  await expect(page.locator("main .feedback")).toHaveCount(0);
  await expect(page.locator(".toast")).toHaveCount(0, { timeout: 8500 });
  await expect(row.getByText("Inativo", { exact: true })).toBeVisible();
});
test("desktop com sidebar, busca por matrícula/CPF/nome e perfil longo legível", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await expect(page.locator(".desktop-sidebar")).toBeVisible();
  await expect(page.locator(".bottom-nav")).toBeHidden();
  await page.screenshot({ path: "test-results/admin-desktop.png" });
  await page
    .getByRole("button", { name: "Colaboradores", exact: true })
    .click();
  for (const value of ["1001", "529.982.247-25", "joao"]) {
    await page.getByLabel("Buscar colaborador", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.locator(".employee-row")).toHaveCount(1);
    await expect(page.locator(".employee-row")).toContainText("João da Silva");
  }
  await page.screenshot({ path: "test-results/people-desktop.png" });
  await page.getByRole("button", { name: "Minha conta", exact: true }).click();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 360, height: 640 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".profile-card h2")).toHaveText(
      "Marcos Vinicius de Almeida dos Santos",
    );
    const fit = await page.locator(".profile-card").evaluate((card) => {
      const h = card.querySelector("h2")!;
      const c = card.getBoundingClientRect(),
        t = h.getBoundingClientRect();
      return (
        t.bottom <= c.bottom &&
        t.top >= c.top &&
        t.right <= c.right &&
        card.scrollHeight <= card.clientHeight + 1
      );
    });
    expect(fit).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/profile-${viewport.width}.png`,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Resumo", exact: true }).click();
  await page.getByRole("button", { name: "QR do portal público" }).click();
  const expected = renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value: "https://cestas-de-natal-limpebras.vercel.app/",
      size: 210,
      marginSize: 3,
    }),
  );
  const path = Array.from(expected.matchAll(/ d="([^"]+)"/g)).at(-1)?.[1];
  expect(path).toBeTruthy();
  await expect(page.locator(".share-code svg path").last()).toHaveAttribute(
    "d",
    path!,
  );
  await expect(page.getByRole("dialog")).toContainText(
    "cestas-de-natal-limpebras.vercel.app",
  );
});
test("acessos do RH em passos e confirmações HeroUI", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Minha conta", exact: true }).click();
  await page
    .getByRole("button", { name: "Acessos do RH", exact: true })
    .click();
  await page.getByRole("button", { name: "Adicionar administrador" }).click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Conferente de Teste");
  await page.getByLabel("Matrícula", { exact: true }).fill("98765");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Senha", { exact: true }).fill("Password12345!");
  await page.getByLabel("Confirmar senha").fill("Password12345!");
  await page.getByRole("button", { name: "Criar acesso" }).click();
  await expect(
    page.getByText("Acesso criado.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remover acesso de Conferente de Teste" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remover acesso", exact: true })
    .click();
  await expect(page.getByText("Mat. 98765 · Inativo")).toBeVisible();
});
test("welcome e identificação cabem sem scroll em tamanhos de celular", async ({
  page,
}) => {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Uma cesta de carinho. Para você." }),
    ).toBeVisible();
    await fits(page);
    await page.screenshot({
      path: `test-results/public-${viewport.width}.png`,
    });
    await page.getByRole("button", { name: "Retirar minha cesta" }).click();
    await fits(page);
  }
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Pronto para a próxima entrega?" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/admin-login.png" });
});
