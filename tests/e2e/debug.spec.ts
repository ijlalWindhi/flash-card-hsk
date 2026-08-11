import { test } from "@playwright/test"
import { E2E_ADMIN_PASSWORD } from "./env"

test("traces creating a manual word", async ({ page }) => {
  await page.goto("/admin/login")
  await page.getByLabel("Kata sandi admin").fill(E2E_ADMIN_PASSWORD)
  await page.getByRole("button", { name: "Masuk" }).click()
  await page.getByRole("heading", { name: "Kelola kata" }).waitFor()

  await page.getByLabel("Hanzi").fill("例词")
  await page.getByLabel("Pinyin").fill("lìcí")
  await page.getByLabel("Arti Indonesia").fill("contoh kata")
  await page.getByLabel("Arti Inggris").fill("example word")

  console.log("VALUES BEFORE CLICK:", {
    hanzi: await page.getByLabel("Hanzi").inputValue(),
    pinyin: await page.getByLabel("Pinyin").inputValue(),
    id: await page.getByLabel("Arti Indonesia").inputValue(),
    en: await page.getByLabel("Arti Inggris").inputValue(),
  })

  const seen: Array<string> = []
  page.on("request", (r) => seen.push(`${r.method()} ${r.url().replace(/^http:\/\/localhost:3100/, "")}`))
  page.on("requestfailed", (r) => seen.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText}`))
  page.on("pageerror", (e) => seen.push(`PAGEERROR ${e.message.slice(0, 300)}`))

  await page.getByRole("button", { name: "Tambah kata" }).click()
  await page.waitForTimeout(3000)

  console.log("REQUESTS AFTER CLICK:")
  for (const entry of seen) {
    if (/@vite|@fs|node_modules|\.css|__tsd/.test(entry)) continue
    console.log("  ", entry)
  }
  console.log("URL:", page.url())
  console.log(
    "VALUES AFTER:",
    await page.getByLabel("Hanzi").inputValue(),
    "| table:",
    (await page.locator("main").innerText()).includes("Belum ada kata manual")
      ? "empty"
      : "has rows",
  )
})
