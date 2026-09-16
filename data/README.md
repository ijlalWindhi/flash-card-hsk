# Level 4 seed data

Two decks, one per syllabus. Both hold only the words **introduced at** Level 4 — the
levels below are not repeated — and both are built by the same pipeline from the same two
dictionaries, so a card reads the same way whichever file it came from.

| File           | Syllabus                | Rows  | Served at        |
| -------------- | ----------------------- | ----- | ---------------- |
| `hsk4-3.0.csv` | HSK 3.0 (2025-11, CLEC) | 1,000 | `/`, the default |
| `hsk4-2.0.csv` | HSK 2.0 (2012, Hanban)  | 600   | `/hsk2`          |

`npm run db:seed` imports both. A row is told apart by its `source_version`, which is what
the list, flashcard and quiz pages filter on; `src/features/vocabulary/syllabus.ts` maps
each `source_version` to its URL prefix.

The two syllabuses share **132 words**. Those are seeded twice, once per syllabus under
different `external_id`s, because each list is browsed on its own. A learner's quiz
progress is therefore tracked per syllabus, not per word: studying 严格 in the 3.0 list
earns nothing in the 2.0 list.

Manual entries — the ones an administrator types in — carry no `source_version` and so
appear under **both** syllabuses.

Licence and full provenance: [`../ATTRIBUTION.md`](../ATTRIBUTION.md) and
[`../docs/dataset-provenance.md`](../docs/dataset-provenance.md). Both files are
**CC BY-SA 4.0** because they derive from CC-CEDICT and CC-CIDICT.

## Columns

Identical in both files.

| Column           | Meaning                                                                         |
| ---------------- | ------------------------------------------------------------------------------- |
| `external_id`    | Stable, source-relative ID (`hsk3-4-0001`, `hsk2-4-0001`). Never a database ID. |
| `hanzi`          | Simplified form, from the syllabus.                                             |
| `pinyin`         | Tone-marked, from the syllabus, verbatim.                                       |
| `translation_id` | Indonesian senses from CC-CIDICT, `;`-separated.                                |
| `translation_en` | English senses from CC-CEDICT, `;`-separated.                                   |
| `source_name`    | The syllabus — the authority for **membership**.                                |
| `source_url`     | Where that syllabus was read from.                                              |
| `source_version` | `2025-11` for the 3.0 deck, `2012` for the 2.0 deck.                            |
| `verified_at`    | Date the pipeline last ran and passed `npm run data:validate`.                  |

A cell holding several senses uses `;`. A sense that contained `;` upstream has it
rewritten to `,` so the delimiter stays unambiguous. Glosses are capped at 3 senses and
160 characters so a flashcard stays readable.

A handful of 2.0 rows carry two readings in `pinyin` (`空 kōng, kòng`) because the 2012
syllabus lists them that way. Their glosses take senses from each reading in turn, so a
card never spends all three slots on one pronunciation.

## Rebuilding

```bash
npm run data:build                    # hsk4-3.0.csv
npm run data:build -- --standard=2.0  # hsk4-2.0.csv
npm run data:build -- --refresh       # re-download the sources first
npm run data:validate                 # gates both files
```

`.cache/hsk-sources/` is gitignored and holds ~20 MB, so a rebuild without `--refresh`
does no network I/O. The build fails loudly rather than emitting a partial file if any
row cannot be resolved to both an Indonesian and an English gloss.

Rebuilding with `--refresh` picks up whatever CC-CEDICT and CC-CIDICT have published
since, so glosses can move even when the word list has not. That is expected; bump
`verifiedAt` in `scripts/build-hsk4-dataset.ts` when it happens.

## Known editorial decisions

These are the only places where a file is not a mechanical join of its sources. They live
in `scripts/build-hsk4-dataset.ts` so they are reviewable.

1. **Three words have no dictionary entry** in either CC-CEDICT or CC-CIDICT, so their
   glosses are hand-authored (`MANUAL_GLOSSES_30`, `MANUAL_GLOSSES_20`):
   - 3.0 — `眼里 yǎnli` "in one's eyes"
   - 3.0 — `有劲儿 yǒujìnr` "strong; energetic"
   - 2.0 — `弹钢琴 tán gāngqín` "to play the piano" (a phrase; both dictionaries gloss
     弹 and 钢琴 separately)

2. **`批 pī` appears twice in the 3.0 syllabus**, once as a verb and once as a classifier,
   with identical pinyin. Both dictionaries fold every sense into one entry, so the
   second row selects the classifier senses (`SENSE_OVERRIDES`). The two cards are
   therefore distinguishable even though they share `(hanzi, pinyin)`.

   This is the one legitimate `(hanzi, pinyin)` collision in either file. It is why the
   database enforces `(hanzi, pinyin)` uniqueness on **manual** entries only — official
   rows are keyed by `external_id` — and why `npm run data:validate` reports it as a
   homograph rather than a duplicate. `hsk4-2.0.csv` has no such collision.

3. **The 2012 list's numeric-pinyin column is not used.** It drops neutral tones
   (`bao1zi`) and carries transcription errors (参观 is written `cang1uan1`), so the
   dictionary key is recovered instead by rendering each CC-CEDICT reading of the same
   Hanzi as tone-marked pinyin and keeping the one the syllabus matches. Where the list
   writes tone sandhi (`búguò`) or a neutral-tone variant (`fùqin`), the match falls back
   to comparing syllables without tones.

4. **A capitalised CC-CEDICT reading loses to a lower-case one.** Capitalisation marks a
   proper noun there, so 干 resolves to `gan1` "dry" rather than `Gan1` "surname Gan".
