// scripts/seed.mts
import { getDb } from "../src/server/db";
import { DEMO_STUDENT_PASSWORD, DEMO_TEACHER, seedDemo } from "../src/server/seed";

const result = await seedDemo(getDb());
if (result === "exists") {
  console.log("The demo data is already there. Delete data/slidekick.db to start fresh.");
} else {
  console.log("Demo data ready.\n");
  console.log(`Teacher   ${DEMO_TEACHER.email}   password ${DEMO_TEACHER.password}`);
  console.log(`Class     8A Biology   code ${result.classCode}`);
  console.log(`Students  password ${DEMO_STUDENT_PASSWORD}`);
  for (const s of result.students) console.log(`          ${s.login}`);
}
