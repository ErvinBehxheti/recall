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
  await expect(page).toHaveURL(/\/teacher$/);
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
