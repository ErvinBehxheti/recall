// e2e/classes.spec.ts
import { expect, test } from "@playwright/test";
import { createClass, joinClass, signupStudent, signupTeacher } from "./helpers";

test("a teacher creates a Biology class and a student joins it with the code", async ({ page, browser }) => {
  await signupTeacher(page);
  const { code, url } = await createClass(page, "biology", "8A Biology");
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  const student = await (await browser.newContext()).newPage();
  await signupStudent(student, "Mira");
  await joinClass(student, "NOPE22");
  await expect(student.locator("main").getByRole("alert")).toContainText("doesn't match a class");
  await joinClass(student, code.toLowerCase());
  await expect(student).toHaveURL(/\/learn\/biology$/);
  await expect(student.getByRole("heading", { level: 1 })).toHaveText("Biology");

  await student.goto("/learn");
  await expect(student.getByRole("link", { name: /Chemistry/ })).toContainText("Enter a class code");
  await expect(student.getByRole("link", { name: /Biology/ })).toContainText("No lessons yet");

  await page.goto(url);
  await expect(page.getByText("1 student")).toBeVisible();
  await expect(page.getByText("Mira")).toBeVisible();
});

test("a teacher cannot open another teacher's class", async ({ page, browser }) => {
  await signupTeacher(page, "Ms One");
  const { url } = await createClass(page);
  const other = await (await browser.newContext()).newPage();
  await signupTeacher(other, "Ms Two");
  const response = await other.goto(url);
  expect(response?.status()).toBe(404);
});
