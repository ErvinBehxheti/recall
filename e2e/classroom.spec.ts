// e2e/classroom.spec.ts
import { expect, test, type Page } from "@playwright/test";
import demo from "../src/demo/photosynthesis.json" with { type: "json" };
import { joinClass, publishSampleLesson, signupStudent, signupTeacher } from "./helpers";

const lesson = demo.lesson;
const total = lesson.quiz.length;

/** Reads the shown question, finds it in the sample lesson, and answers right or wrong. */
async function answerCurrentQuestion(page: Page, right: boolean) {
  const text = (await page.getByRole("heading", { level: 1 }).textContent())!.trim();
  const question = lesson.quiz.find((q) => q.question === text)!;
  const correctText = question.options[question.correctIndex];
  const options = page.locator("ol li button");
  const rightOption = options.filter({ has: page.getByText(correctText, { exact: true }) });
  if (right) await rightOption.click();
  else await options.filter({ hasNot: page.getByText(correctText, { exact: true }) }).first().click();
  await expect(page.getByText(right ? "Right." : "Not quite.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Next question|See results/ }).click();
}

test("a student reads a published lesson, takes the private quiz and never receives the answer key", async ({ page, browser }) => {
  await signupTeacher(page);
  const { code } = await publishSampleLesson(page);

  const student = await (await browser.newContext()).newPage();
  await signupStudent(student, "Mira");
  await joinClass(student, code);
  await expect(student).toHaveURL(/\/learn\/biology$/);
  await student.getByRole("link", { name: new RegExp(lesson.title) }).click();
  await expect(student.getByText(`${lesson.cards.length} pages, ${total} questions`)).toBeVisible();

  await student.getByRole("link", { name: "Start lesson" }).click();
  for (let n = 1; n < lesson.cards.length; n++) {
    await expect(student).toHaveURL(new RegExp(`/pages/${n}$`));
    await expect(student.getByRole("heading", { level: 1 })).toHaveText(lesson.cards[n - 1].title);
    await student.getByRole("link", { name: "Next page" }).click();
  }
  await student.getByRole("link", { name: "Finish lesson" }).click();

  await expect(student.getByRole("heading", { name: "Quiz unlocked" })).toBeVisible();
  const started = student.waitForResponse((r) => /\/api\/learn\/lessons\/\d+\/attempts$/.test(r.url()));
  await student.getByRole("button", { name: "Start quiz" }).click();
  const body = await (await started).text();
  expect(body).not.toContain("correctIndex");
  expect(body).not.toContain("explanation");
  await expect(student.getByText(`Question 1 of ${total}`)).toBeVisible();

  for (let i = 0; i < total; i++) await answerCurrentQuestion(student, i !== 0);
  await expect(student).toHaveURL(/\/results\?attempt=\d+$/);
  await expect(student.getByText(`${total - 1} / ${total}`)).toBeVisible();

  await student.getByRole("link", { name: /^Review page \d+/ }).click();
  await expect(student.getByText("You missed a question about this page.")).toBeVisible();
  await student.getByRole("link", { name: "Back to results" }).click();
  await expect(student).toHaveURL(/\/results\?attempt=\d+$/);

  await student.getByRole("link", { name: "Retry missed questions" }).click();
  await expect(student.getByRole("heading", { name: "Second try" })).toBeVisible();
  await student.getByRole("button", { name: "Start quiz" }).click();
  await expect(student.getByText("Question 1 of 1")).toBeVisible();
  await answerCurrentQuestion(student, true);
  await expect(student.getByText("1 / 1")).toBeVisible();
  await expect(student.getByText("This was practice.")).toBeVisible();

  await student.goto("/learn");
  await expect(student.getByRole("link", { name: /Biology/ })).toContainText("1 of 1 done");
  await student.goto("/learn/biology");
  await expect(student.getByRole("link", { name: new RegExp(lesson.title) })).toContainText(`${total - 1} / ${total}`);
});

test("a student outside the class gets nothing from the lesson pages or the quiz API", async ({ page, browser }) => {
  await signupTeacher(page);
  const { lessonId } = await publishSampleLesson(page);

  const outsider = await (await browser.newContext()).newPage();
  await signupStudent(outsider, "Dren");
  expect((await outsider.goto(`/learn/lessons/${lessonId}`))?.status()).toBe(404);
  expect((await outsider.goto(`/learn/lessons/${lessonId}/pages/1`))?.status()).toBe(404);
  const attempt = await outsider.request.post(`/api/learn/lessons/${lessonId}/attempts`, { data: { mode: "start" } });
  expect(attempt.status()).toBe(404);
  const answer = await outsider.request.post(`/api/learn/attempts/1/answers`, { data: { qid: "q1", index: 0 } });
  expect(answer.status()).toBe(404);
});
