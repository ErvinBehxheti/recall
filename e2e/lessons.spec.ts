// e2e/lessons.spec.ts
import { expect, test, type Page } from "@playwright/test";
import demo from "../src/demo/photosynthesis.json" with { type: "json" };
import { createClass, signupTeacher } from "./helpers";

async function uploadSampleDeck(page: Page) {
  await page.locator('input[type="file"]').setInputFiles("samples/pdf/photosynthesis.pdf");
  await expect(page).toHaveURL(/\/teacher\/lessons\/\d+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(demo.lesson.title);
}

test("a teacher uploads slides, edits a question and publishes", async ({ page }) => {
  await signupTeacher(page);
  const { url } = await createClass(page);
  await uploadSampleDeck(page);

  const question = page.getByLabel("Question 1 text", { exact: true });
  await question.fill("Edited question?");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(question).toHaveValue("Edited question?");

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("can open this lesson")).toBeVisible();

  await page.goto(url);
  await expect(page.getByRole("link", { name: new RegExp(demo.lesson.title) })).toContainText("Published");
});

test("publishing an invalid draft shows a plain message and keeps the draft", async ({ page }) => {
  await signupTeacher(page);
  await createClass(page);
  await uploadSampleDeck(page);

  await page.getByLabel("Question 1 text", { exact: true }).fill("");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Fix this before publishing");
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
});

test("another teacher cannot open the lesson", async ({ page, browser }) => {
  await signupTeacher(page, "Ms One");
  await createClass(page);
  await uploadSampleDeck(page);
  const lessonUrl = page.url();
  const other = await (await browser.newContext()).newPage();
  await signupTeacher(other, "Ms Two");
  expect((await other.goto(lessonUrl))?.status()).toBe(404);
});
