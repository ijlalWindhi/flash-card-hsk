import { expect, test } from "@playwright/test"
import { E2E_ADMIN_PASSWORD } from "./env"
import { openVocabularyList } from "./helpers"

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login")
  await page.getByLabel("Kata sandi admin").fill(E2E_ADMIN_PASSWORD)
  await page.getByRole("button", { name: "Masuk" }).click()
  await expect(page.getByRole("heading", { name: "Kelola kata" })).toBeVisible()
}

test("sends an unauthenticated visitor to the login form", async ({ page }) => {
  await page.goto("/admin")
  await expect(page).toHaveURL(/\/admin\/login$/)
  await expect(page.getByLabel("Kata sandi admin")).toBeVisible()
})

test("refuses a wrong password without revealing why", async ({ page }) => {
  await page.goto("/admin/login")
  await page.getByLabel("Kata sandi admin").fill("not-the-password")
  await page.getByRole("button", { name: "Masuk" }).click()

  await expect(page.getByText("Kata sandi salah.")).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test("allows the administrator to add and remove a manual word", async ({
  page,
}) => {
  await signIn(page)

  await page.getByLabel("Hanzi").fill("例词")
  await page.getByLabel("Pinyin").fill("lìcí")
  await page.getByLabel("Arti Indonesia").fill("contoh kata")
  await page.getByLabel("Arti Inggris").fill("example word")
  await page.getByRole("button", { name: "Tambah kata" }).click()

  const row = page.getByRole("row", { name: /例词/ })
  await expect(row).toBeVisible()

  // The new word reaches the public deck too.
  await openVocabularyList(page)
  await page.getByRole("searchbox", { name: /cari/i }).fill("lici")
  await expect(page.getByRole("checkbox", { name: /例词 lìcí/i })).toBeVisible()

  await signIn(page)
  await page.getByRole("button", { name: "Hapus 例词" }).click()
  await expect(page.getByRole("row", { name: /例词/ })).toHaveCount(0)
})

test("reports a duplicate word beside the field that caused it", async ({
  page,
}) => {
  await signIn(page)

  for (const attempt of [1, 2]) {
    await page.getByLabel("Hanzi").fill("重复")
    await page.getByLabel("Pinyin").fill("chóngfù")
    await page.getByLabel("Arti Indonesia").fill(`duplikat ${attempt}`)
    await page.getByLabel("Arti Inggris").fill(`duplicate ${attempt}`)
    await page.getByRole("button", { name: "Tambah kata" }).click()
  }

  await expect(page.getByText("重复 sudah pernah ditambahkan.")).toBeVisible()
  await expect(page.getByLabel("Arti Indonesia")).toHaveValue("duplikat 2")
})

test("reports missing fields without contacting the server", async ({
  page,
}) => {
  await signIn(page)

  await page.getByLabel("Hanzi").fill("测试")
  await page.getByRole("button", { name: "Tambah kata" }).click()

  await expect(page.getByText("Pinyin wajib diisi.")).toBeVisible()
  await expect(page.getByLabel("Hanzi")).toHaveValue("测试")
})

test("edits a manual word and leaves official rows alone", async ({ page }) => {
  await signIn(page)

  await page.getByLabel("Hanzi").fill("编辑")
  await page.getByLabel("Pinyin").fill("biānjí")
  await page.getByLabel("Arti Indonesia").fill("sunting")
  await page.getByLabel("Arti Inggris").fill("to edit")
  await page.getByRole("button", { name: "Tambah kata" }).click()

  await page.getByRole("button", { name: "Ubah 编辑" }).click()
  await page.getByLabel("Arti Indonesia").fill("menyunting")
  await page.getByRole("button", { name: "Simpan perubahan" }).click()

  await expect(page.getByRole("cell", { name: "menyunting" })).toBeVisible()
  // Official rows never appear in the manual table.
  await expect(page.getByRole("row", { name: /阿姨/ })).toHaveCount(0)
})

test("logging out closes the editor", async ({ page }) => {
  await signIn(page)
  await page.getByRole("button", { name: "Keluar" }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)

  await page.goto("/admin")
  await expect(page).toHaveURL(/\/admin\/login$/)
})
