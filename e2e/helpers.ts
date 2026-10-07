// e2e/helpers.ts
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "classroom-1";

const unique = () => `${Date.now()}${Math.floor(Math.random() * 10_000)}`;

export async function signupTeacher(page: Page, name = "Ms Hoxha") {
  const email = `teacher${unique()}@example.com`;
  await page.goto("/signup/teacher");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/teacher");
  return { email, name };
}

export async function signupStudent(page: Page, name = "Mira") {
  await page.goto("/signup/student");
  await page.getByLabel("Your first name").fill(name);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/signup\/welcome/);
  const login = (await page.getByTestId("login-name").textContent())!.trim();
  return { login, name };
}

export async function login(page: Page, loginName: string) {
  await page.goto("/login");
  await page.getByLabel("Email or login name").fill(loginName);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function createClass(page: Page, subject = "biology", name = "8A Biology") {
  await page.goto("/teacher/classes/new");
  await page.getByLabel("Subject").selectOption(subject);
  await page.getByLabel("Class name").fill(name);
  await page.getByRole("button", { name: "Create class" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const code = (await page.getByTestId("join-code").textContent())!.trim();
  return { code, url: page.url() };
}

export async function joinClass(page: Page, code: string) {
  await page.goto("/join");
  await page.getByLabel("Class code").fill(code);
  await page.getByRole("button", { name: "Join class" }).click();
}

/** Teacher: create a Biology class, upload the sample deck (fake AI) and publish it. */
export async function publishSampleLesson(page: Page, className = "8A Biology") {
  const { code, url } = await createClass(page, "biology", className);
  await page.locator('input[type="file"]').setInputFiles("samples/pdf/photosynthesis.pdf");
  await expect(page).toHaveURL(/\/teacher\/lessons\/\d+$/, { timeout: 30_000 });
  const lessonId = Number(page.url().match(/lessons\/(\d+)/)![1]);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("can open this lesson")).toBeVisible();
  return { code, classUrl: url, lessonId };
}
