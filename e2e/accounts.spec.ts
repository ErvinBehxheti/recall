// e2e/accounts.spec.ts
import { expect, test } from "@playwright/test";
import { login, logout, signupStudent, signupTeacher } from "./helpers";

test("anonymous visitors are sent to the login page", async ({ page }) => {
  for (const path of ["/teacher", "/learn", "/join"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("a teacher signs up, logs out, logs back in and cannot open the student area", async ({ page }) => {
  const { email, name } = await signupTeacher(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Hello, ${name}`);
  await page.goto("/learn");
  await expect(page).toHaveURL(/\/teacher$/);
  await logout(page);
  await login(page, email.toUpperCase());
  await expect(page).toHaveURL(/\/teacher$/);
});

test("two students with the same name get different login names and both can log in", async ({ page, browser }) => {
  const first = await signupStudent(page, "Mira");
  const other = await (await browser.newContext()).newPage();
  const second = await signupStudent(other, "Mira");
  expect(first.login).not.toBe(second.login);

  await logout(page);
  await login(page, first.login.toLowerCase());
  await expect(page).toHaveURL(/\/learn$/);
  await logout(page);
  await login(page, second.login);
  await expect(page).toHaveURL(/\/learn$/);
});

test("a wrong password shows a plain error and stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or login name").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("That login name or password is wrong.");
  await expect(page).toHaveURL(/\/login$/);
});
