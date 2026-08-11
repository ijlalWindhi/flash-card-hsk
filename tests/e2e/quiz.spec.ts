import { expect, test } from "@playwright/test"
import { openVocabularyList } from "./helpers"
import type { Page } from "@playwright/test"

/**
 * Answers the current multiple-choice question by picking the first option.
 *
 * Which option is right varies run to run, so the helper handles both: a wrong
 * answer waits for the learner to press Lanjut, a right one advances itself.
 * That makes these tests exercise the real feedback flow rather than a path
 * that only holds when the guess happens to be lucky.
 */
async function answerFirstOption(page: Page) {
  await page.getByTestId("quiz-options").getByRole("button").first().click()

  const feedback = page.getByTestId("quiz-feedback")
  await expect(feedback).toBeVisible()

  if ((await feedback.getAttribute("data-correct")) === "false") {
    await page.getByRole("button", { name: /^lanjut$/i }).click()
  }
  await expect(feedback).toBeHidden()
}

async function selectWords(page: Page, count: number) {
  await openVocabularyList(page)
  const checkboxes = page.getByRole("checkbox")
  for (let index = 0; index < count; index += 1) {
    await checkboxes.nth(index).check()
  }
}

test("quizzes a hand-picked selection and reports the score", async ({
  page,
}) => {
  await selectWords(page, 2)
  await page.getByRole("button", { name: /quiz 2 kata/i }).click()
  await page.getByRole("button", { name: /^mulai quiz$/i }).click()

  await expect(page).toHaveURL("/quiz")
  await expect(page.getByTestId("quiz-progress")).toHaveText("1 / 2")

  await answerFirstOption(page)
  await expect(page.getByTestId("quiz-progress")).toHaveText("2 / 2")
  await answerFirstOption(page)

  await expect(page.getByText(/hasil · pilihan ganda/i)).toBeVisible()
  await expect(page.getByText(/^\d\/2$/)).toBeVisible()
})

test("grades typed pinyin without tone marks", async ({ page }) => {
  await openVocabularyList(page)
  await page.getByRole("searchbox", { name: /cari/i }).fill("anzhi")
  await page.getByRole("checkbox", { name: /安置 ānzhì/i }).check()

  await page.getByRole("button", { name: /quiz 1 kata/i }).click()
  await page.getByRole("button", { name: /ketik jawaban/i }).click()
  await page.getByRole("button", { name: /^mulai quiz$/i }).click()

  await page.getByLabel(/jawaban pinyin/i).fill("anzhi")
  await page.getByRole("button", { name: /periksa/i }).click()

  await expect(page.getByTestId("quiz-feedback")).toHaveAttribute(
    "data-correct",
    "true"
  )
})

test("offers a quiz once the flashcard deck is finished", async ({ page }) => {
  await selectWords(page, 2)
  await page.getByRole("button", { name: /belajar 2 kartu/i }).click()

  // The offer belongs to the last card, not to the whole session.
  await expect(page.getByText(/deck selesai/i)).toBeHidden()
  await page.getByRole("button", { name: /berikutnya/i }).click()
  await expect(page.getByText(/deck selesai/i)).toBeVisible()

  await page.getByRole("button", { name: /uji kata-kata ini/i }).click()
  await page.getByRole("button", { name: /^mulai quiz$/i }).click()

  await expect(page).toHaveURL("/quiz")
  await expect(page.getByText(/lanjutan sesi belajar/i)).toBeVisible()
})

test("disables a mode the deck is too small for, and says why", async ({
  page,
}) => {
  await selectWords(page, 2)
  await page.getByRole("button", { name: /quiz 2 kata/i }).click()

  const matching = page.getByRole("button", { name: /mencocokkan/i })
  await expect(matching).toBeDisabled()
  await expect(matching).toContainText(/butuh minimal 4 kata/i)

  // Typing needs only one word, so it stays available.
  await expect(
    page.getByRole("button", { name: /ketik jawaban/i })
  ).toBeEnabled()
})

test("starts a random quiz from the vocabulary page", async ({ page }) => {
  await openVocabularyList(page)
  await page.getByRole("button", { name: /quiz acak/i }).click()

  await page.getByLabel(/jumlah kata/i).fill("5")
  await page.getByRole("button", { name: /^mulai quiz$/i }).click()

  await expect(page.getByTestId("quiz-progress")).toHaveText("1 / 5")
  await expect(page.getByText(/kata acak/i)).toBeVisible()
})

test("rejects a word count outside the deck", async ({ page }) => {
  await selectWords(page, 2)
  await page.getByRole("button", { name: /quiz 2 kata/i }).click()

  await page.getByLabel(/jumlah kata/i).fill("9")
  await page.getByRole("button", { name: /^mulai quiz$/i }).click()

  await expect(
    page.getByText(/jumlah kata harus antara 2 dan 2/i)
  ).toBeVisible()
  await expect(page).toHaveURL("/")
})

test("invites a guest to sign in instead of losing their result quietly", async ({
  page,
}) => {
  await selectWords(page, 2)
  await page.getByRole("button", { name: /quiz 2 kata/i }).click()
  await page.getByRole("button", { name: /^mulai quiz$/i }).click()

  await answerFirstOption(page)
  await answerFirstOption(page)

  await expect(page.getByText(/hasil ini belum tersimpan/i)).toBeVisible()
  // Scoped to the result panel: the header carries its own "Masuk" link.
  await expect(
    page.getByRole("main").getByRole("link", { name: /^masuk$/i })
  ).toBeVisible()
})

test("explains an empty quiz session instead of showing a blank question", async ({
  page,
}) => {
  await page.goto("/quiz")

  await expect(page.getByText(/sesi quiz tidak ditemukan/i)).toBeVisible()
  await page.getByRole("link", { name: /daftar kosa kata/i }).click()
  await expect(page).toHaveURL("/")
})

/**
 * The e2e server has no working Firebase project, which is the point.
 *
 * Whether the credentials are absent or merely unusable — a placeholder key
 * left in `.env` produces the latter — the learner must get a sentence, not a
 * failed request, and must be told the quiz still works. Asserting the shared
 * closing sentence covers both without pinning the test to either.
 */
test("keeps the quiz usable when accounts are unavailable", async ({
  page,
}) => {
  await page.goto("/daftar")
  await page.getByLabel(/nama pengguna/i).fill("pelajar")
  await page.getByLabel(/kata sandi/i).fill("rahasia123")
  await page.getByRole("button", { name: /^daftar$/i }).click()

  await expect(
    page.getByRole("alert").filter({
      hasText: /quiz tetap bisa dimainkan tanpa masuk/i,
    })
  ).toBeVisible()

  // The promise in that sentence has to hold.
  await page.goto("/")
  await expect(page.getByRole("button", { name: /quiz acak/i })).toBeEnabled()
})
