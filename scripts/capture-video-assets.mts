// scripts/capture-video-assets.mts
// Records the real app for the promo video: seeds a throwaway database, starts the dev server with the
// fake AI, screenshots the stateful screens and the sample-deck slides, and writes the class report.
// Nothing here touches data/slidekick.db or spends API credit.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Locator, type Page } from "@playwright/test";

const DB = "data/video.db";
const PORT = 3200;
const BASE = `http://localhost:${PORT}`;
const OUT = "public/video";
const GENERATED = "remotion/generated";

process.env.SLIDEKICK_DB = DB;
process.env.SLIDEKICK_FAKE_AI = "1";

for (const suffix of ["", "-shm", "-wal"]) rmSync(`${DB}${suffix}`, { force: true });
mkdirSync(`${OUT}/slides`, { recursive: true });
mkdirSync(GENERATED, { recursive: true });

const { getDb } = await import("../src/server/db");
const { DEMO_STUDENT_PASSWORD, DEMO_TEACHER, seedDemo } = await import("../src/server/seed");
const { getLessonResults } = await import("../src/server/results");

const db = getDb();
const seeded = await seedDemo(db);
if (seeded === "exists") throw new Error("The video database was not empty.");

const teacher = db.prepare("SELECT id, role, name FROM users WHERE login = ?").get(DEMO_TEACHER.email) as {
  id: number;
  role: "teacher";
  name: string;
};
const { report } = getLessonResults(db, teacher, seeded.lessonId);
if (!report) throw new Error("The seeded class has no report.");
writeFileSync(`${GENERATED}/report.json`, JSON.stringify(report, null, 2));
console.log(`report: ${report.finished}/${report.enrolled} finished, weakest page ${report.weakest.pageNumber}`);

function startServer(): ChildProcess {
  return spawn("npx", ["next", "dev", "--port", String(PORT)], {
    shell: true,
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, SLIDEKICK_DB: DB, SLIDEKICK_FAKE_AI: "1", NEXT_DIST_DIR: ".next-video" },
  });
}

function stopServer(server: ChildProcess) {
  if (server.pid === undefined) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
  else server.kill();
}

async function waitForServer() {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE}/login`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("The dev server did not start in time.");
}

type Rect = { x: number; y: number; width: number; height: number };
const rects: Record<string, Rect> = {};

async function remember(key: string, locator: Locator) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error(`No box for ${key}`);
  rects[key] = box;
}

/** The Next dev badge lives in a <nextjs-portal> element; hide it so it never reaches the video. */
async function shoot(page: Page, file: string) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `${OUT}/${file}` });
}

/** The box around the text itself, not the full-width block that holds it. */
async function rememberText(key: string, locator: Locator) {
  const box = await locator.first().evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  rects[key] = box;
}

async function logIn(page: Page, loginName: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email or login name").fill(loginName);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => url.pathname !== "/login");
}

const server = startServer();
try {
  await waitForServer();
  const browser = await chromium.launch();
  const viewport = { width: 1280, height: 720 };

  // Teacher: a new class (its code is the one the student types), then upload and the quiz editor.
  const teacherPage = await (await browser.newContext({ baseURL: BASE, viewport, deviceScaleFactor: 2 })).newPage();
  await logIn(teacherPage, DEMO_TEACHER.email, DEMO_TEACHER.password);
  await teacherPage.goto("/teacher/classes/new");
  await teacherPage.getByLabel("Subject").selectOption("biology");
  await teacherPage.getByLabel("Class name").fill("8A Biology");
  await teacherPage.getByRole("button", { name: "Create class" }).click();
  await teacherPage.getByTestId("join-code").waitFor();
  const classUrl = teacherPage.url();
  const code = ((await teacherPage.getByTestId("join-code").textContent()) ?? "").trim();
  await rememberText("joinCode", teacherPage.getByTestId("join-code"));
  await remember("uploadButton", teacherPage.getByRole("button", { name: "Upload slides" }));
  await shoot(teacherPage, "teacher-class.png");

  await teacherPage.locator('input[type="file"]').setInputFiles("samples/pdf/photosynthesis.pdf");
  await teacherPage.waitForURL(/\/teacher\/lessons\/\d+$/, { timeout: 60_000 });
  const question = teacherPage.getByLabel("Question 1 text", { exact: true });
  await question.scrollIntoViewIfNeeded();
  await question.click();
  await teacherPage.evaluate(() => window.scrollBy(0, -80));
  await teacherPage.waitForTimeout(300);
  await remember("question1", question);
  await shoot(teacherPage, "teacher-review.png");

  // The top of the editor (the page fields), then the class page with the lesson as a draft and as published.
  const lessonUrl = teacherPage.url();
  await teacherPage.evaluate(() => window.scrollTo(0, 0));
  await teacherPage.waitForTimeout(300);
  await remember("page1Title", teacherPage.getByLabel("Page 1 title"));
  await shoot(teacherPage, "teacher-editor.png");
  await teacherPage.goto(classUrl);
  await teacherPage.waitForLoadState("networkidle");
  await shoot(teacherPage, "teacher-lessons-draft.png");
  await teacherPage.goto(lessonUrl);
  const publishing = teacherPage.waitForResponse((r) => r.url().includes("/status") && r.ok(), { timeout: 30_000 });
  await teacherPage.getByRole("button", { name: "Publish", exact: true }).click();
  await publishing;
  await teacherPage.goto(classUrl);
  await teacherPage.getByText("Published", { exact: true }).first().waitFor();
  await remember("lessonStatus", teacherPage.getByText("Published", { exact: true }).first());
  await shoot(teacherPage, "teacher-lessons-published.png");

  // Student: the subject list, and the join screen with the new class code typed in.
  const studentPage = await (await browser.newContext({ baseURL: BASE, viewport, deviceScaleFactor: 2 })).newPage();
  await logIn(studentPage, seeded.students[0].login, DEMO_STUDENT_PASSWORD);
  await studentPage.goto("/learn");
  await studentPage.waitForLoadState("networkidle");
  await shoot(studentPage, "student-home.png");
  await studentPage.goto("/learn/biology");
  await studentPage.waitForLoadState("networkidle");
  await remember("subjectScore", studentPage.getByText(/^\d+ \/ \d+$/).first());
  await shoot(studentPage, "student-subject.png");
  await studentPage.goto("/join");
  await studentPage.getByLabel("Class code").fill(code);
  await remember("codeInput", studentPage.getByLabel("Class code"));
  await shoot(studentPage, "student-join.png");

  // A new student's sign-up: only a first name and a password.
  const signupPage = await (await browser.newContext({ baseURL: BASE, viewport, deviceScaleFactor: 2 })).newPage();
  await signupPage.goto("/signup/student");
  await signupPage.getByLabel("Your first name").waitFor();
  await remember("signupName", signupPage.getByLabel("Your first name"));
  await shoot(signupPage, "signup-student.png");

  // The slides of both sample decks, for the pile at the start.
  const slidePage = await (await browser.newContext({ viewport, deviceScaleFactor: 0.5 })).newPage();
  const slides: string[] = [];
  for (const deck of ["photosynthesis", "ww1-causes"]) {
    await slidePage.goto(pathToFileURL(path.resolve(`samples/decks/${deck}.html`)).href);
    const count = await slidePage.locator("section.slide").count();
    for (let i = 0; i < count; i++) {
      const file = `slides/${deck}-${String(i + 1).padStart(2, "0")}.png`;
      await slidePage.locator("section.slide").nth(i).screenshot({ path: `${OUT}/${file}` });
      slides.push(file);
    }
  }

  writeFileSync(`${GENERATED}/capture.json`, JSON.stringify({ code, viewport, rects, slides }, null, 2));
  console.log(`captured: class code ${code}, ${slides.length} slides, ${Object.keys(rects).length} rects`);
  await browser.close();
} finally {
  stopServer(server);
}
