import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

/**
 * The syllabus a learner picked has to be the syllabus they get back.
 *
 * It lives in the URL rather than in client state precisely so a refresh, a
 * bookmark or a shared link keeps it, which is what these tests pin down. The
 * word counts are the seed files' own: 1,000 for HSK 3.0, 600 for HSK 2.0 and
 * 1,300 for HSK 2.0 Level 5.
 */

/** A word each syllabus introduces and the other one does not. */
const ONLY_IN_HSK3 = "丈夫"
const ONLY_IN_HSK2 = "弹钢琴"
/** HSK 2.0 Level 5, which shares the 2.0 deck's `source_version`. */
const ONLY_IN_HSK2_L5 = "系领带"

async function readyList(page: Page) {
  const list = page.getByTestId("vocabulary-list")
  await expect(list).toHaveAttribute("data-interactive", "true")
  return list
}

/**
 * How many words the list says it is showing.
 *
 * Read rather than hard-coded: the administrator's own words join both lists,
 * and the browser suite creates some before this spec runs. The totals that
 * matter here are relative, not absolute.
 */
async function wordCount(page: Page): Promise<number> {
  const list = await readyList(page)
  const label = await list.getByText(/^\d+ kata$/).textContent()
  return Number(label?.replace(/\D/g, ""))
}

test("serves a different word list at each syllabus URL", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.getByText(/^HSK 3\.0 · tingkat 4 · \d+ kata baru$/)
  ).toBeVisible()
  const hsk3 = await wordCount(page)

  await page.goto("/hsk2")
  await expect(
    page.getByText(/^HSK 2\.0 · tingkat 4 · \d+ kata baru$/)
  ).toBeVisible()
  const hsk2 = await wordCount(page)

  // 1,000 seeded words against 600, so the gap survives any manual additions.
  expect(hsk2).toBeGreaterThanOrEqual(600)
  expect(hsk3).toBeGreaterThan(hsk2)
})

test("shows only the words the chosen syllabus introduces", async ({
  page,
}) => {
  await page.goto("/")
  const list = await readyList(page)
  await page.getByRole("searchbox", { name: /cari/i }).fill(ONLY_IN_HSK2)
  await expect(list).toContainText("Tidak ada kata yang cocok")

  await page.goto("/hsk2")
  const hsk2List = await readyList(page)
  await page.getByRole("searchbox", { name: /cari/i }).fill(ONLY_IN_HSK2)
  await expect(hsk2List).toContainText(ONLY_IN_HSK2)

  await page.getByRole("searchbox", { name: /cari/i }).fill(ONLY_IN_HSK3)
  await expect(hsk2List).toContainText("Tidak ada kata yang cocok")
})

test("switches syllabus from the navbar and puts it in the URL", async ({
  page,
}) => {
  await page.goto("/")
  const switcher = page.getByRole("group", { name: /pilih silabus/i })
  await expect(switcher.getByRole("link", { name: "3.0" })).toHaveAttribute(
    "aria-current",
    "page"
  )

  await switcher.getByRole("link", { name: "2.0" }).click()
  await expect(page).toHaveURL(/\/hsk2$/)
  await expect(switcher.getByRole("link", { name: "2.0" })).toHaveAttribute(
    "aria-current",
    "page"
  )

  await switcher.getByRole("link", { name: "3.0" }).click()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
})

test("serves HSK 2.0 Level 5 as its own list, apart from Level 4", async ({
  page,
}) => {
  await page.goto("/hsk2/5")
  await expect(
    page.getByText(/^HSK 2\.0 · tingkat 5 · \d+ kata baru$/)
  ).toBeVisible()
  expect(await wordCount(page)).toBeGreaterThanOrEqual(1300)

  const search = page.getByRole("searchbox", { name: /cari/i })
  const list = await readyList(page)
  await search.fill(ONLY_IN_HSK2_L5)
  await expect(list).toContainText(ONLY_IN_HSK2_L5)
  await search.fill(ONLY_IN_HSK2)
  await expect(list).toContainText("Tidak ada kata yang cocok")

  // Same `source_version`, so only the level keeps it out of the 2.0 list.
  await page.goto("/hsk2")
  const hsk2List = await readyList(page)
  await page.getByRole("searchbox", { name: /cari/i }).fill(ONLY_IN_HSK2_L5)
  await expect(hsk2List).toContainText("Tidak ada kata yang cocok")
})

test("switches level within HSK 2.0 and offers none for HSK 3.0", async ({
  page,
}) => {
  await page.goto("/hsk2")
  const levels = page.getByRole("group", { name: /pilih tingkat/i })
  await expect(levels.getByRole("link", { name: "Tingkat 4" })).toHaveAttribute(
    "aria-current",
    "page"
  )

  await levels.getByRole("link", { name: "Tingkat 5" }).click()
  await expect(page).toHaveURL(/\/hsk2\/5$/)
  await expect(levels.getByRole("link", { name: "Tingkat 5" })).toHaveAttribute(
    "aria-current",
    "page"
  )
  // Still HSK 2.0 — the level changed, not the syllabus.
  await expect(
    page
      .getByRole("group", { name: /pilih silabus/i })
      .getByRole("link", { name: "2.0" })
  ).toHaveAttribute("aria-current", "page")

  await page
    .getByRole("group", { name: /pilih silabus/i })
    .getByRole("link", { name: "3.0" })
    .click()
  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await expect(page.getByRole("group", { name: /pilih tingkat/i })).toHaveCount(
    0
  )
})

test("keeps the chosen syllabus across a reload", async ({ page }) => {
  await page.goto("/hsk2")
  await readyList(page)

  await page.reload()

  await expect(
    page.getByText(/^HSK 2\.0 · tingkat 4 · \d+ kata baru$/)
  ).toBeVisible()
  await expect(
    page
      .getByRole("group", { name: /pilih silabus/i })
      .getByRole("link", { name: "2.0" })
  ).toHaveAttribute("aria-current", "page")
})

test("keeps a study deck inside the syllabus it was built from", async ({
  page,
}) => {
  await page.goto("/hsk2")
  await readyList(page)
  await page.getByRole("button", { name: /mulai sesi acak/i }).click()
  await page.getByLabel(/jumlah kartu/i).fill("5")
  await page.getByRole("button", { name: /mulai belajar/i }).click()

  await expect(page).toHaveURL(/\/hsk2\/study$/)
  await expect(page.getByTestId("study-progress")).toBeVisible()

  // The 3.0 study page must not inherit a deck built from the 2.0 list.
  await page.goto("/study")
  await expect(page.getByText(/sesi tidak ditemukan/i)).toBeVisible()

  // ...and the 2.0 deck is still there where it was left.
  await page.goto("/hsk2/study")
  await expect(page.getByTestId("study-progress")).toBeVisible()
})
