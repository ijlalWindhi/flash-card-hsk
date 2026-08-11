import { expect, test } from "@playwright/test"
import { openVocabularyList } from "./helpers"

test("studies an explicitly selected card Hanzi-first", async ({ page }) => {
  await openVocabularyList(page)
  // 安置 is a Level 4 word. The plan's example used 安排, which HSK 3.0
  // introduces at Level 3 and this deck therefore excludes by design.
  await page.getByRole("searchbox", { name: /cari/i }).fill("anzhi")

  await page.getByRole("checkbox", { name: /安置 ānzhì/i }).check()
  await page.getByRole("button", { name: /mulai 1 kartu/i }).click()

  const card = page.getByRole("button", { name: /flashcard/i })
  await expect(card).toContainText("安置")
  await expect(page.getByText("mengatur")).toBeHidden()

  await card.click()
  await expect(page.getByText("mengatur")).toBeVisible()
  await expect(page.getByText("to arrange for")).toBeVisible()
})

test("samples a random deck when nothing is selected", async ({ page }) => {
  await openVocabularyList(page)
  await page.getByRole("button", { name: /mulai sesi acak/i }).click()

  await page.getByLabel(/jumlah kartu/i).fill("20")
  await page.getByRole("button", { name: /mulai belajar/i }).click()

  await expect(page.getByTestId("study-progress")).toHaveText(/\/ 20$/)
})

test("rejects a card count outside the deck", async ({ page }) => {
  await openVocabularyList(page)
  await page.getByRole("button", { name: /mulai sesi acak/i }).click()

  await page.getByLabel(/jumlah kartu/i).fill("0")
  await page.getByRole("button", { name: /mulai belajar/i }).click()

  await expect(page.getByText(/jumlah kartu harus antara 1 dan/i)).toBeVisible()
  await expect(page).toHaveURL("/")
})

test("moves through a deck with the keyboard and clamps at both ends", async ({
  page,
}) => {
  await openVocabularyList(page)

  const checkboxes = page.getByRole("checkbox")
  await checkboxes.nth(0).check()
  await checkboxes.nth(1).check()
  await page.getByRole("button", { name: /mulai 2 kartu/i }).click()

  const progress = page.getByTestId("study-progress")
  await expect(progress).toHaveText("01 / 02")

  // The card flips on Enter as well as on click.
  await page.getByRole("button", { name: /flashcard/i }).press("Enter")
  await expect(page.getByTestId("study-reveal")).toBeVisible()

  await expect(page.getByRole("button", { name: /sebelumnya/i })).toBeDisabled()
  await page.getByRole("button", { name: /berikutnya/i }).click()
  await expect(progress).toHaveText("02 / 02")
  await expect(page.getByRole("button", { name: /berikutnya/i })).toBeDisabled()

  // Each card starts face down again.
  await expect(page.getByTestId("study-reveal")).toBeHidden()
})

test("narrows the deck from any field and reports the count", async ({
  page,
}) => {
  await openVocabularyList(page)
  // At least the 1,000 official words; the admin suite may have added its own,
  // so the deck is asserted as a floor rather than an exact number.
  const count = page.getByText(/^\d+ kata$/)
  const total = Number((await count.innerText()).replace(/\D/g, ""))
  expect(total).toBeGreaterThanOrEqual(1000)

  await page.getByRole("searchbox", { name: /cari/i }).fill("mengatur")
  await expect(count).not.toHaveText(`${total} kata`)
  await expect(
    page.getByRole("checkbox", { name: /安置 ānzhì/i })
  ).toBeVisible()
})

test("explains an empty session instead of showing a blank card", async ({
  page,
}) => {
  await page.goto("/study")

  await expect(page.getByText(/sesi tidak ditemukan/i)).toBeVisible()
  await page.getByRole("link", { name: /daftar kosa kata/i }).click()
  await expect(page).toHaveURL("/")
})
