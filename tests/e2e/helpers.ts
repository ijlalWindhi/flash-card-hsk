import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

/**
 * Opens the deck and waits for React to take over the server-rendered markup.
 *
 * Without this, typing into the search box can land before the handlers are
 * attached: the DOM shows the text, React's state does not, and the list never
 * filters.
 */
export async function openVocabularyList(page: Page) {
  await page.goto("/")
  await expect(page.getByTestId("vocabulary-list")).toHaveAttribute(
    "data-interactive",
    "true"
  )
}
