# Quiz and User Accounts Design

## Purpose

Give a learner a way to test the words they just studied. Flashcards let you
recognise a word once you have already seen the answer; a quiz forces recall
before the answer appears, which is what turns a browsed list into remembered
vocabulary.

The quiz is reachable straight from the end of a flashcard deck, and from the
home page for words chosen at random, picked by hand, or drawn from the words
the learner keeps getting wrong.

## Scope

This spec covers two subsystems that ship together:

1. **User accounts** — username and password, no email. Registration, sign in,
   sign out, and a session cookie.
2. **Quiz** — four question modes, four ways to build a deck, instant feedback,
   a result screen, and progress that persists for signed-in learners.

The owner was told during design that these are independent subsystems and that
building the quiz first would put a usable feature in front of learners sooner.
They chose a single combined spec. That decision stands; this document records
the reasoning so a future reader knows the coupling was deliberate, not
accidental.

### Out of scope

- **Migrating vocabulary from Turso to Firestore.** The owner intends to
  consolidate on Firestore. All *new* collections in this spec go to Firestore
  directly, so none of this work is throwaway. The existing 1,000-word
  `vocabulary` table stays on Turso for now: moving it touches the seed script,
  the admin CRUD, and the Playwright fixtures, which is a separate piece of work
  with its own risk. Until it happens the app talks to both stores.
- **Password recovery.** Username-only accounts have no recovery channel. A
  forgotten password means a lost account. Accepted deliberately in exchange for
  needing no email service.
- **Cross-user leaderboards.** Progress is private to each account.

## Chosen Architecture

### Module layout

Pure logic stays separate from components and from I/O, matching the existing
`src/features/<domain>/` convention.

```
src/db/
  firestore.server.ts     Firestore client, initialised once per process
src/features/accounts/
  auth.server.ts          scrypt hashing, JWT cookie session, currentUser/requireUser
  auth.schemas.ts         Zod schemas for register and sign in
  auth.functions.ts       server functions: registerFn, loginFn, logoutFn, meFn
  users.server.ts         Firestore reads and writes for the users collection
src/features/quiz/
  types.ts                QuizMode, QuizQuestion, QuizAnswer, QuizOutcome
  build.ts                buildQuiz(items, mode, count, random) — pure
  grade.ts                answer comparison, including pinyin tolerance
  session.ts              pending quiz deck in sessionStorage
  badges.ts               badge definitions as static data
  progress.server.ts      result recording, word stats, daily streak, badges
  quiz.functions.ts       server functions
src/components/quiz/      quiz-runner, question-*, quiz-result, quiz-start-dialog
src/routes/               quiz.tsx, masuk.tsx, daftar.tsx
```

`buildQuiz` and `grade` take no I/O and receive their randomness as a parameter,
so every question-generation rule is testable without a browser or a database.

### Data model (Firestore)

| Collection | Document | Fields |
| --- | --- | --- |
| `users` | auto id | `username`, `usernameLower` (unique key), `passwordHash`, `createdAt` |
| `quizResults` | auto id | `userId`, `mode`, `source`, `total`, `correct`, `bestStreak`, `completedAt`, `dayKey` |
| `wordStats` | `${userId}_${vocabularyId}` | `userId`, `vocabularyId`, `hanzi`, `correctCount`, `wrongCount`, `lastSeenAt` |
| `userBadges` | `${userId}_${badgeId}` | `userId`, `badgeId`, `earnedAt` |

Two deliberate choices:

- **`wordStats` uses a composite document id** rather than a query-and-update.
  One write per word with no read first, and no way to create a duplicate row
  for the same learner and word.
- **The daily streak is derived, never stored.** `quizResults.dayKey` holds a
  `YYYY-MM-DD` string; the streak is computed by walking those keys backwards
  from today. A stored counter can drift out of step with the results it claims
  to summarise; a derived one cannot.

### Grading happens in the browser

Answers are graded client-side so feedback is instant, with no network wait
between tapping an option and seeing whether it was right. The server receives
one summary at the end of the session.

This means a determined learner could edit their own score through devtools.
For a private study app with no cross-user ranking, cheating harms only the
cheater, and the cost of server-side grading — a round trip per question, plus
holding the answer key server-side — buys nothing. Recorded as a conscious
trade-off, not an oversight.

### Authentication

Accounts reuse the pattern already proven by the admin login: a signed JWT in an
`httpOnly` cookie, verified with `jose`. Two differences from the admin flow:

- The payload carries a `sub` (the user id), so the session identifies *which*
  learner rather than just asserting a role.
- Passwords are hashed with `scrypt` from `node:crypto` — 16-byte random salt,
  stored as `scrypt$N$r$p$salt$hash`, verified in constant time with
  `timingSafeEqual`. No new dependency, and the parameters are recorded in the
  hash so they can be raised later without invalidating existing passwords.

Firebase Auth was considered and rejected: it requires an email address, and the
agreed design is username-only.

## Quiz Modes

All four modes present one deck of words. A session uses a single mode, chosen
on the start screen, so a learner can drill one skill at a time.

1. **Multiple choice** (`choice`). One Hanzi, four options. The direction varies
   per question: Hanzi → meaning, meaning → Hanzi, or Hanzi → pinyin. Distractors
   come from other words in the same deck, falling back to the full vocabulary
   when the deck is too small. Decks under four words drop to two or three
   options.
2. **Matching** (`match`). A board of five Hanzi and five shuffled meanings. Tap
   one from each column: a correct pair locks and dims, a wrong pair releases and
   counts against both words. A twenty-word deck becomes four boards. Needs at
   least four words.
3. **Typing** (`typing`). A Hanzi is shown; the learner types the pinyin without
   tone marks. Graded through the existing `normalizePinyin`, so tones, case and
   stray spaces are all forgiven. A wrong answer shows what was typed beside what
   was expected.
4. **True or false** (`truefalse`). A Hanzi paired with a meaning; half the
   questions pair it with a different word's meaning. Two buttons.

### Feedback

Correct answers show a brief confirmation and advance on their own after a short
pause. Wrong answers show the correct answer and wait for the learner to
continue, so there is time to read it. All motion respects the
`prefers-reduced-motion` rule already in `styles.css`.

## Deck Sources

Every entry point funnels into the same start dialog — pick a mode, pick a
question count — and then to `/quiz`.

1. **After a flashcard deck.** On the last card of `/study`, a panel offers to
   quiz the same words.
2. **Random.** From the home page, sampled from all 1,000 words.
3. **Hand-picked.** The existing selection bar on the home page gains a quiz
   action alongside the study action.
4. **Words you get wrong.** Signed-in learners only. Built from `wordStats`,
   ordered by wrong count. The card appears on the home page only when there is
   something to review.

Modes that cannot support the deck size are disabled in the dialog with the
reason shown, rather than hidden.

## Progress and Motivation

- **Streak within a session.** A run counter of consecutive correct answers,
  shown live and broken by a wrong answer. The best run is part of the result.
- **Daily streak and target.** Consecutive days with at least one finished quiz,
  plus a small daily question target, shown on the home page. Signed in only.
- **Badges.** Static definitions in `badges.ts`, awarded when a session summary
  is recorded, and surfaced on the result screen the moment they are earned.

Guests see their score, their best run, and their wrong words — everything
except persistence. The result screen invites them to sign in to keep it.

## Error Handling

| Situation | Behaviour |
| --- | --- |
| Quiz deck missing (new tab, cleared storage) | Empty state matching `/study`, linking back to the vocabulary list |
| Deck too small for the chosen mode | Mode disabled in the start dialog with the reason |
| Recording a result fails | Result screen still shown in full, with a quiet note that progress was not saved |
| Username already taken | Field-level message on the registration form |
| Wrong username or password | One generic message, so neither field confirms what exists |
| Firestore unreachable | Quiz remains playable; only persistence degrades |

## Testing

Written after the implementation, at the owner's request, as a closing
verification rather than per task.

- **Unit (Vitest)** — question generation for each mode, distractor uniqueness,
  small-deck fallbacks, pinyin grading tolerance, daily streak from day keys,
  badge evaluation, password hash round-trip and rejection.
- **End to end (Playwright)** — play a multiple-choice quiz to the result
  screen; register, sign in, finish a quiz, and confirm the result persists;
  redo the wrong words from a result screen.
