# Recall: 3 minutes on stage, 1 minute for questions

Team Slide Rules: Ensar, Diar and Omer. KosICT 15, 10 October 2026.

This is the easy version. It is **not word for word**. Each part has a goal and a few points. Say them in your own words, in your own order, with short sentences. The video does a lot of the work for you.

`pitch-script.md` is the long 3:20 version with a line for every second of the video. Use that one only if you want to talk along with the video. This page is the simple plan.

## The clock

| Clock | Part | Who | What |
|---|---|---|---|
| 0:00 | 1. Anisa | Ensar (Diar and Omer say their names) | The problem |
| 0:40 | 2. What we built | Diar | One idea, one sentence |
| 1:00 | 3. The video | everyone watches | 75 seconds, no talking |
| 2:15 | 4. The real website | Omer and Diar | Show it is real |
| 2:45 | 5. Honest and close | Ensar, then all three | What is next, thank you |
| **3:00** | **Questions** | the one who knows | 1 minute |

The video is 75 seconds. Press play at 1:00 and it ends at 2:15. If you are late or early by 10 seconds, nothing breaks. Do not rush to catch up. Just keep going.

## 1. Anisa (0:00 to 0:40), Ensar

Start with the person, not with the app. The brief asks for this.

**Goal:** the audience feels Anisa's problem before they see anything.

Points:
- This is Anisa. She is a university student.
- Her teacher gives her slides. Slides are made for **teaching**, not for **studying**.
- She studies them, and later she forgets. *(Only if true: say what Anisa told you, in her words.)*
- We are Team Slide Rules. I am Ensar. **Diar:** "I am Diar." **Omer:** "I am Omer."
- We built **Recall** for Anisa.

## 2. What we built (0:40 to 1:00), Diar

**Goal:** one clear idea before the video, so the video is easy to follow.

Points:
- Recall turns slides into short pages. One idea on each page.
- Then a quiz. And when you get an answer wrong, Recall sends you **back to the page that teaches it**.
- That is the main idea. Say it clearly.
- "Now watch." Press play. Sound at about half volume.

## 3. The video (1:00 to 2:15)

Say nothing. Stand still and look at the screen. Silence while a video plays looks confident, not weak.

If something goes wrong (no sound, no video), say "Let me show you the real website" and go straight to part 4. You lose nothing important.

## 4. The real website (2:15 to 2:45), Omer and Diar

**Goal:** prove it is a real working website, not only a video.

*Window 1 (the student) and window 2 (the teacher) are already open. See the checklist at the bottom.*

Points:
- **Diar:** "This is the real website. A student in our demo class."
- **Omer:** reads "Five out of six." Clicks **Review page 4**. Reads "Light reactions."
- **Diar:** "This is the page that teaches the answer." Then, only if there is time: "And this is the teacher's page for the whole class."

## 5. Honest and close (2:45 to 3:00)

**Goal:** be honest, then end warmly. Honest teams are trusted.

Points (Ensar):
- Recall is not finished.
- The AI writes a **first draft**. The teacher checks every question before students see it.
- Next: Anisa tries it with her own slides. *(Only if true.)*

Then all three together: **Diar** "Kosova in 2036 is built one person at a time." **Ensar** "Our person is Anisa." **Omer** "Thank you."

Look at the audience. Wait. Do not run into the questions.

## If you are behind or ahead

- Behind at 2:15: cut the teacher page in part 4.
- Behind at 2:45: say only "Recall is not finished, the teacher checks every question. Thank you."
- Ahead: do not add words. Pause and look at the people.

## The one minute for questions

With one minute you will get **two or three questions**, not ten. We prepared twenty so that nothing is a surprise.

Rules for answering:
1. **Listen to the whole question.** If you did not understand, say: "Can you say it again, please?" That is fine.
2. **Answer in two sentences.** About 15 seconds. The jury asks the next one if they want more.
3. **The person who knows answers.** Look at your team first. Do not all talk at once.
4. **If you do not know, say so.** "We do not know yet. We will find out." This is a good answer. A made-up answer is a bad one.
5. **Omer** can answer the short ones (marked below). One short true sentence is enough.
6. **Never say something you did not do.** Examples: tests with Anisa, numbers, who wrote what. If it is not true, do not say it.

This is the Future Developers Corner, so the jury will probably ask **how it works**, not only why you made it. Part A below has the story questions. Part B has the technical ones. Read both.

## How it works in 30 seconds (all three must know this)

If you can say these five lines, you can answer most technical questions.

1. **The teacher uploads a PDF or PowerPoint.** The website checks the file (type, under 20 MB, up to 60 slides).
2. **The server sends the slides to an AI model (Claude).** We ask it for a lesson in a fixed shape: pages with one idea each, and quiz questions. Every quiz question points to the page that teaches it.
3. **The server checks the AI's answer** with rules before saving it. If it is broken, it asks again once.
4. **The teacher edits and publishes.** Students only see published lessons. Students read the pages and take the quiz.
5. **Everything is saved in a small database file** on the laptop. When a student answers wrong, the website uses the question's page link to show "Review page 4".

Stack, if asked: **Next.js and React with TypeScript** (website and server in one project), **Tailwind** for the style, **SQLite** for the database, **Claude** through Anthropic's SDK for the AI. The video is made with **Remotion** (a video made from code).

## Part A: 10 story and product questions

The answers below are **ideas, not lines to memorise**. Change the words so they sound like you. Anything in *[brackets]* you must fill in with what is really true.

### 1. Why did you choose Anisa? *(Ensar)*

"Because the brief says to build for one person. Anisa is a student, and she told us that slides are hard to study from. [If true: She is our friend / we know her.] So we built Recall for her first."

### 2. Did Anisa try it? What did she say? *(Diar)*

Say only what really happened.

- If she tried it: "Anisa tried it. She said: *[her real words]*."
- If not yet: "Not yet. Next, she uploads her own slides, and then we ask her if she remembers more. We want to measure that, not guess."

### 3. Who built it? Did an adult help? *(Ensar, the one who knows the truth)*

Decide this **before** you go on stage, with your teacher. The rule says adults may not build, code, design or write any part of the project.

Answer with the facts, calmly: "*[Who had the idea. Who talked to Anisa. Who did what.]* We also used an AI coding assistant, and *[say exactly how: what it did, and what you did yourselves]*."

Do not exaggerate in either direction. The jury respects a clear, true answer.

### 4. What if the AI is wrong? *(Diar)*

"It can be wrong. That is why the AI only writes a **first draft**. The teacher reads and edits every page and every quiz question, and only then publishes it. Students never see a draft."

### 5. Why not just ask ChatGPT to summarise the slides? *(Ensar)*

"A summary is only text. Recall does three things together: short pages, a quiz, and a link from every wrong answer to the exact page that teaches it. Also the **teacher** sees where the whole class got stuck, for example 8 of 10 missed the same idea."

### 6. How is it different from Kahoot or Google Classroom? *(Diar)*

"Those tools make the quiz. They do not rewrite the lesson. In Recall the quiz **sends you back to learning**, to the right page. And we are not live like Kahoot: a student studies when they want, at their own speed."

### 7. Does it work in Albanian? *(Omer or Ensar)*

"Yes, if the slides are in Albanian, Recall writes the lesson in Albanian. The buttons and screens are in English for now." *(Say this only if you tested Albanian slides. If you did not, say: "The code can detect Albanian. We have not tested it enough yet, so we do not want to promise it.")*

### 8. What about student privacy and safety? *(Diar)*

"A student signs up with a first name and a password. We add a number, like `Mira#4821`, so there is no email and no surname. Passwords are stored scrambled, not as plain text. Everything is stored on one laptop in this demo. The class in the demo is made up."

### 9. How does this help Kosova in 2036? *(Omer, short; or Ensar)*

"If students remember what they study, they learn more. Teachers also see who is stuck, early. So fewer students are left behind. That is a better Kosova in 2036." *(Keep it small and true. Do not promise big numbers.)*

### 10. Will this replace teachers? *(Ensar)*

"No. The teacher is the most important person in it. The teacher uploads, checks every question, publishes, and then explains again the idea that the class missed. Recall just shows the teacher where to look."

## Part B: 10 technical questions

Say the **simple version first**. Only go deeper if the jury asks. If a question goes past what you know, say what you do know and "I would need to check the code for the rest." That is honest, and it is fine.

### T1. What did you build it with? Why? *(Diar)*

"Next.js and React with TypeScript, so the website and the server are one project. SQLite for the database, because it is one file and needs no setup on a laptop. Claude for the AI, because it can read a whole PDF and answer in a fixed format."

### T2. How does the AI part work? Do you just send the text to ChatGPT? *(Ensar)*

"We send the slides to Claude with instructions: one idea per page, and a quiz where every question points to a page. We also tell it the answer must be in a fixed shape (a JSON schema), so it is data our website can use, not free text. A PDF goes in as the PDF. For PowerPoint we first read the text out of the file ourselves."

### T3. How do you know the AI's answer is not broken? *(Diar)*

"We do not trust it. After it answers, our code checks the rules: how many pages and questions, no empty text, no duplicate ids, exactly four options that are all different, and every question points to a page that really exists. If a check fails, we ask once more, and if it fails again the teacher sees an error. We also clean the text before saving it."

### T4. How does "Review page 4" work? *(Omer, short; or Diar)*

"Every quiz question has a field that says which page teaches it. When a student gets it wrong, the website takes that field and links to that page."

### T5. How do students not see the answers in advance? *(Diar)*

"The server does not send the right answer to the browser until the student has answered that question. Also, the order of the options is shuffled for each attempt, so a friend's answers do not help. A student cannot just open the page source and read them."

### T6. How are logins and passwords kept safe? *(Ensar)*

"Passwords are never stored. We store a scrambled version (scrypt, with a random salt). The login session token is also stored scrambled. Too many wrong logins in a row get blocked. Students sign up with a first name only, so we do not collect emails or surnames."

### T7. What if a thousand students use it at once? *(Ensar, be honest)*

"Not today. This version stores everything in one SQLite file on one laptop, which is fine for a class and a demo. For a whole school we would move to a database on a real server. We chose the simple option on purpose, to get something that works first."

### T8. What happens with a bad or huge file? *(Diar)*

"We only accept PDF or PowerPoint, up to 20 MB and 60 slides. We check the start of the file to see what it really is, not just the name. If there is no readable text, for example a deck made only of pictures, we tell the user and suggest the PDF version."

### T9. Did you test it? How? *(Ensar)*

"Yes. There are automated tests for the important parts: checking the AI's output, scoring the quiz, logins, and reading PowerPoint files. There are also browser tests that click through the website." *(Say this only after you check that `npm test` passes on the laptop. If you did not run them yourselves, say what you did run.)*

### T10. Do you send student data to the AI? *(Omer, short; or Diar)*

"No. Only the teacher's slides go to the AI. Student names, logins and quiz answers stay in our database and are never sent to it."

### If the jury asks to see the code

Have the project open in VS Code before you start. These are the places to show:

- `src/lib/generate-lesson.ts`: the request to the AI.
- `src/lib/validate-lesson.ts`: the rules that check the AI's answer.
- `src/server/quiz.ts`: answers are only returned after the student answered.
- `src/server/passwords.ts`: scrambled passwords.

Only show code you can explain in one sentence.

## Extra questions you may get (one line each)

- **How much does it cost?** "One lesson costs about 20 to 50 US cents in AI cost for a 20-slide deck."
- **How long did it take?** *[Say the true number.]*
- **What was the hardest part?** *[Say the true thing, for example: making the quiz send you back to the right page.]*
- **What did you learn?** *[Your own words. One thing is enough.]*
- **Does it work without internet?** "Making a new lesson needs internet. In this demo we use a lesson that is already made." *(Demo mode: with no AI key the app builds a sample Photosynthesis lesson. Say so if asked.)*
- **Is this real data?** "No. The demo class is made up, to show how the teacher's page works."

## Before you go on stage (same as the long script)

- [ ] On the laptop, run `npm run seed` once. It prints the student login names.
- [ ] **Window 1, student:** log in as **Sofia**, **Arta** or **Elena** (for example `sofia#1234`, the seed prints the number). Password `demo-student-1`. Open Biology, then Photosynthesis, then **See your result**. It shows 5 / 6 and **Review page 4**. Do not take the quiz again as this student.
- [ ] **Window 2, teacher:** `teacher@demo.test`, password `demo-teacher-1`. Open the Photosynthesis lesson results.
- [ ] The video `media/recall-promo.mp4` is open, ready to play full screen, volume about half.
- [ ] Do not upload a new deck live. The video already shows it.
- [ ] Anisa said yes to being on stage. First name only.
- [ ] Practice the whole thing three times with a timer. Target: finish part 5 at **2:55 to 3:05**.
