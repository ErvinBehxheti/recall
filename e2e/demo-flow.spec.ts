import { expect, test } from "@playwright/test";
import demo from "../src/demo/photosynthesis.json" with { type: "json" };
import { buildClassReport } from "../src/lib/sample-class";

const lesson = demo.lesson;
const firstMissedPage = lesson.cards.findIndex((c) => c.id === lesson.quiz[0].cardId) + 1;

test("fresh tab on a deep link goes home (Review Focus 3)", async ({ page }) => {
  await page.goto("/lesson/99");
  await expect(page).toHaveURL(/\/$/);
});

test("demo flow: learn, quiz, review a missed page, teacher view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn tonight's slides");

  // The key listener attaches after hydration, so retry the press until the demo starts.
  await expect(async () => {
    await page.keyboard.press("d");
    await expect(page.getByRole("heading", { name: "Building your lesson" })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/lesson$/, { timeout: 20_000 });
  await expect(page.getByText(`${lesson.cards.length} pages, ${lesson.quiz.length} questions`)).toBeVisible();

  await page.getByRole("link", { name: "Start lesson" }).click();
  for (let n = 1; n < lesson.cards.length; n++) {
    await expect(page).toHaveURL(new RegExp(`/lesson/${n}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lesson.cards[n - 1].title);
    await page.keyboard.press("ArrowRight");
  }
  await page.getByRole("link", { name: "Finish lesson" }).click();

  await expect(page.getByRole("heading", { name: "Quiz unlocked" })).toBeVisible();
  await page.getByRole("button", { name: "Start quiz" }).click();

  for (const [i, q] of lesson.quiz.entries()) {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(q.question);
    const pick = i === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex;
    await page.keyboard.press(String(pick + 1));
    await expect(page.getByText(i === 0 ? "Not quite." : "Right.", { exact: true })).toBeVisible();
    await page.keyboard.press("Enter");
  }

  await expect(page).toHaveURL(/\/results$/);
  const score = `${lesson.quiz.length - 1} / ${lesson.quiz.length}`;
  await expect(page.getByText(score)).toBeVisible();

  await page.getByRole("link", { name: new RegExp(`Review page ${firstMissedPage}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/lesson/${firstMissedPage}\\?review=1$`));
  await page.getByRole("link", { name: "Back to results" }).click();
  await expect(page).toHaveURL(/\/results$/);

  await page.reload();
  await expect(page.getByText(score)).toBeVisible();

  await page.getByRole("link", { name: "Teacher view" }).click();
  await expect(page.getByText(buildClassReport(lesson).insight)).toBeVisible();
  await expect(page.getByText("Preview with sample class data")).toBeVisible();
});
