# `hsk4-3.0.csv`

The canonical seed input: the 1,000 words **introduced at** HSK 3.0 Level 4. HSK 1–3
words are not present. `npm run db:seed` imports this file; it is the only source of
`kind = 'official'` rows.

Licence and full provenance: [`../ATTRIBUTION.md`](../ATTRIBUTION.md) and
[`../docs/dataset-provenance.md`](../docs/dataset-provenance.md). The file is
**CC BY-SA 4.0** because it derives from CC-CEDICT and CC-CIDICT.

## Columns

| Column           | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| `external_id`    | Stable, source-relative ID (`hsk3-4-0001`). Never a database ID. |
| `hanzi`          | Simplified form, from the syllabus.                              |
| `pinyin`         | Tone-marked, from the syllabus.                                  |
| `translation_id` | Indonesian senses from CC-CIDICT, `;`-separated.                 |
| `translation_en` | English senses from CC-CEDICT, `;`-separated.                    |
| `source_name`    | Always the CLEC syllabus — the authority for **membership**.     |
| `source_url`     | The syllabus PDF.                                                |
| `source_version` | Always `2025-11`.                                                |
| `verified_at`    | Date the pipeline last ran and passed `npm run data:validate`.   |

A cell holding several senses uses `;`. A sense that contained `;` upstream has it
rewritten to `,` so the delimiter stays unambiguous. Glosses are capped at 3 senses and
160 characters so a flashcard stays readable.

## Rebuilding

```bash
npm run data:build            # reuses ~20 MB of cached sources in .cache/
npm run data:build -- --refresh   # re-downloads all three sources
npm run data:validate
```

`.cache/hsk-sources/` is gitignored. The build fails loudly rather than emitting a
partial file if any row cannot be resolved to both an Indonesian and an English gloss.

## Known editorial decisions

These are the only places where the file is not a mechanical join of its three sources.
They live in `scripts/build-hsk4-dataset.ts` so they are reviewable.

1. **Two words have no dictionary entry** in either CC-CEDICT or CC-CIDICT, so their
   glosses are hand-authored (`MANUAL_GLOSSES`):
   - `眼里 yǎnli` — "in one's eyes"
   - `有劲儿 yǒujìnr` — "strong; energetic"

2. **`批 pī` appears twice in the syllabus**, once as a verb and once as a classifier,
   with identical pinyin. Both dictionaries fold every sense into one entry, so the
   second row selects the classifier senses (`SENSE_OVERRIDES`). The two cards are
   therefore distinguishable even though they share `(hanzi, pinyin)`.

   This is the one legitimate `(hanzi, pinyin)` collision in the file. It is why the
   database enforces `(hanzi, pinyin)` uniqueness on **manual** entries only — official
   rows are keyed by `external_id` — and why `npm run data:validate` reports it as a
   homograph rather than a duplicate.
