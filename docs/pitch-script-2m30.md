# Recall: the 2:30 video, and how to present with it

This is for the longer video, `media/recall-promo-2m30.mp4`. Use it if you want to **talk along** with the video. If you prefer to stay silent while it plays, use the 75 second video and `pitch-3min.md` instead. Both videos are in the `media` folder.

## The clock

The video is **150 seconds**. It cannot fit the 1:00 start in `pitch-3min.md`, so the start moves earlier. Part 4 of that plan (the live website) is dropped: this video already shows the real screens.

| Clock | Part | Who | Time |
|---|---|---|---|
| 0:00 | 1. Anisa, and what we built | Ensar, Diar, Omer say their names | 30 s |
| 0:30 | 2. The video, you talk along | all three | 150 s |
| 3:00 | 3. Honest and close | Ensar, then all three | 20 s |
| **3:20** | **Questions** | the one who knows | 40 s |

Press play at **0:30**. It ends at **3:00**. Rehearse part 1 with a timer: if it takes 45 seconds, the whole plan moves 15 seconds later, which still fits under 4:00.

**Part 1 (0:00 to 0:30)** is the same as parts 1 and 2 of `pitch-3min.md`, said faster: Anisa and her problem, your names, "We built Recall for Anisa", then "One idea on each page. A quiz. A wrong answer sends you back to the page that teaches it. Now watch." Press play.

**Part 3 (3:00 to 3:20)** is part 5 of `pitch-3min.md`: "Recall is not finished. The teacher checks every question the AI drafts." Then all three: **Diar** "Kosova in 2036 is built one person at a time." **Ensar** "Our person is Anisa." **Omer** "Thank you."

## The first 67 seconds of the video

The lines for video seconds 0 to 67 are in section 3 of `pitch-script.md` (column "Video"). Nothing moved in that part of the video. Add 30 seconds to get the stage clock, not 43.

## What is new, from video second 67

Say each line when you see the thing on the screen. The "Video" column is seconds from the start of the video.

| Clock | Video | On the screen | Who | Line |
|---|---|---|---|---|
| 1:39 | 70 s | The camera goes up to the class page: the lesson is a draft | Diar | "Every lesson starts as a draft." |
| 1:43 | 74 s | The draft turns into "Published" | Ensar | "Students see it after the teacher publishes." |
| 1:49 | 80 s | The editor opens, the page title is highlighted | Diar | "The teacher can change any page." |
| 1:53 | 84 s | Caption: "Fix any answer." | Omer | "Fix any answer." |
| 2:02 | 92 s | The student's lesson list | Ensar | "Students see their lessons." |
| 2:04 | 95 s | "5 / 6" is highlighted | Ensar | "And how they are doing." |
| 2:11 | 101 s | A big sentence: the right answer never reaches the browser | Diar | "The right answer never reaches the browser until the student has answered." |
| 2:20 | 110 s | The student sign-up form | Ensar | "Students need only a first name." |
| 2:24 | 114 s | Caption: "No email. No phone number." | Omer | "No email. No phone number." |
| 2:28 | 119 s | A big sentence: only the first attempt counts | Diar | "Only the first attempt counts for the teacher. Retries are practice." |
| 2:39 | 130 s | The teacher's table of every student | Ensar | "The teacher sees every student and every topic." |
| 2:43 | 134 s | Caption: "So the teacher knows what to re-teach." | Omer | "So the teacher knows what to re-teach." |

At video second 146 (clock 2:56) the end card shows Recall and your three names. Wait for it. Then start part 3 at 3:00.

The video has no music. It has quiet sound effects only. Play it at about half volume so your voices stay clear.

## Every claim in the new part is true of the app

- Lessons start as drafts and students see them only after the teacher publishes.
- The teacher can edit every page and question.
- The right answer is not sent to the browser until the student has answered that question.
- A student account needs only a first name and a password. No email, no phone number.
- Only a student's first attempt counts for the teacher. Retries are practice.

## Before you go on stage

The same as `pitch-script.md`, except you do not need the two browser windows for a live demo. Do keep `npm run dev` running, in case someone asks to see the real website. Student logins are the name and `#1234`, for example `Elena#1234`, password `demo-student-1`. If the logins do not work, stop the server, delete `data/slidekick.db` and run `npm run seed` again.
