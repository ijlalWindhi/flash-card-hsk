/** Dictionary cells hold `;`-separated senses; commas read better on a card. */
export function formatSenses(value: string): string {
  return value.split(";").join(", ")
}
