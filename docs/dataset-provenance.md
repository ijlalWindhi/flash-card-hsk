# Dataset Provenance

This document records where every field in `data/hsk4-3.0.csv` comes from, under what
licence it may be redistributed, and how to reproduce the file.

## Status disclosure: which HSK are we talking about?

The deck targets **HSK 3.0, Level 4 — the latest published syllabus**, not a claim about
the exam format currently administered at every test centre. CLEC (Center for Language
Education and Cooperation) describes the HSK 3.0 examination as globally piloted and
states that the formal start date is announced separately. The application labels the
deck "HSK 3.0 (latest published syllabus)" everywhere it is shown so learners are not
misled into thinking HSK 2.0 has been retired at their test centre.

## Membership: which 1,000 words are Level 4?

**Authority:** `新版HSK考试大纲` (New HSK Test Syllabus), CLEC, version `2025-11`.

- URL: <https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf>
- This document is the sole authority for **which** words belong to Level 4.
- Level 4 _introduces_ exactly 1,000 words. HSK 1–3 words are excluded; the CSV holds
  the exclusive (newly-introduced) list, never the cumulative list.

**Machine-readable transcription:** [`ivankra/hsk30`](https://github.com/ivankra/hsk30),
file `hsk30.csv`, rows where `Level == 4`.

The syllabus is distributed as a PDF, so the word list was not re-typed by hand. It was
taken from `ivankra/hsk30`, which parses the official CLEC PDF and cross-checks it
against the official HSK website database and two further transcriptions
(`elkmovie/hsk30`, `shawkynasr/HSK-official-Query-System`). Its parsing code is MIT
licensed. We verified the transcription independently before use: the per-level counts
are 500 / 772 / 973 / **1000** / 1071 / 1140 / 5636, summing to 11,092 — matching the
totals published in the official syllabus. Simplified Hanzi, tone-marked pinyin and
part-of-speech come from this source.

## English meanings

**Source:** [CC-CEDICT](https://cc-cedict.org/editor/editor.php?handler=Download),
published by MDBG, licensed **CC BY-SA 4.0**.

Entries are matched on simplified Hanzi plus numeric pinyin so that a word is resolved to
its _term-level_ entry rather than to a character-level definition. Senses are kept in
CC-CEDICT order and truncated to the leading senses so a flashcard stays readable; the
separator is `;`.

## Indonesian meanings

**Source:** [CC-CIDICT](https://cidict.org/download/), version 1.25 (released
2026-07-26), published by Harmony Mandarin, licensed **CC BY-SA 4.0**.

CC-CIDICT is a Chinese–Indonesian dictionary derived from CC-CEDICT and translated by the
Harmony Mandarin editorial team and volunteer editors. It is matched with the same
Hanzi + numeric-pinyin key as CC-CEDICT, so the Indonesian and English glosses on a card
describe the same dictionary sense.

Indonesian glosses are **not** machine-translated by this project. Where CC-CIDICT has no
entry, the gloss is hand-authored and marked in `data/README.md`; those rows are the only
ones in the file whose Indonesian text does not carry dictionary provenance.

## Share-alike obligation

Both CC-CEDICT and CC-CIDICT are CC BY-SA 4.0. `data/hsk4-3.0.csv` is a derivative of
both, so **the dataset is redistributed under CC BY-SA 4.0**, with attribution preserved
in [`../ATTRIBUTION.md`](../ATTRIBUTION.md) and surfaced in the application at `/about`.
The application source code is licensed separately; the share-alike term attaches to the
dataset, not to the surrounding code.

## Verification date

`verified_at` on each row records the date the reproduction pipeline was last run and its
output validated by `npm run data:validate` — that is, the date on which the row's
Hanzi, pinyin, English and Indonesian fields were confirmed non-empty, uniquely keyed and
resolved against the named dictionary release. It is not a claim that a human read all
1,000 rows individually.

## Reproducing the file

See [`../data/README.md`](../data/README.md) for the exact commands.
