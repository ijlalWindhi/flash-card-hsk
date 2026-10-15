# Dataset Provenance

This document records where every field in `data/hsk4-3.0.csv`, `data/hsk4-2.0.csv` and
`data/hsk5-2.0.csv` comes from, under what licence it may be redistributed, and how to reproduce the files.

## Status disclosure: which HSK are we talking about?

Both. They are different syllabuses, not different editions of one list, and the words
they introduce at Level 4 overlap only partly.

- **`hsk4-3.0.csv` — HSK 3.0, Level 4: the latest published syllabus.** CLEC (Center for
  Language Education and Cooperation) describes the HSK 3.0 examination as globally
  piloted and states that the formal start date is announced separately. The application
  labels this deck "HSK 3.0 (latest published syllabus)" everywhere it is shown so
  learners are not misled into thinking HSK 2.0 has been retired at their test centre.
- **`hsk4-2.0.csv` — HSK 2.0, Level 4: the syllabus most test centres still administer.**
  Served at `/hsk2`.
- **`hsk5-2.0.csv` — HSK 2.0, Level 5.** Seeded beside the others and told apart from the
  Level 4 deck by `hsk_level`, but not yet surfaced in the UI.

## Membership: which words are Level 4?

The syllabus is the sole authority for **which** words belong to a level. Neither file
holds the cumulative list — only the words that level _introduces_.

### HSK 3.0 — 1,000 words

**Authority:** `新版HSK考试大纲` (New HSK Test Syllabus), CLEC, version `2025-11`.

- URL: <https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf>
- Level 4 introduces exactly 1,000 words. HSK 1–3 words are excluded.

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

### HSK 2.0 — 600 words

**Authority:** `新汉语水平考试大纲 HSK四级`, Hanban / Confucius Institute Headquarters,
2012 edition. Level 4 introduces 600 words on top of the 600 of HSK 1–3, which is why the
exam is described as requiring 1,200 words.

CLEC no longer hosts the 2.0 syllabus PDF — `chinesetest.cn` now publishes the 3.0
syllabus in its place, and the former `chinesetest.cn/userfiles/file/HSK/HSK-4.pdf`
returns 404. There is therefore no live official URL to cite, and the fetchable authority
is the transcription below. `source_url` on every 2.0 row points at it rather than at a
dead link.

**Machine-readable transcription:** [`glxxyz/hskhsk.com`](https://github.com/glxxyz/hskhsk.com),
file `data/lists/HSK Official With Definitions 2012 L4.txt`, MIT licensed. This is the
list published at <https://hskhsk.com> and widely redistributed in Pleco and Anki decks.

We verified it before use. Its per-level counts are 150 / 152 / 302 / **600** / 1300 /
2500 — the official 2012 totals are 150 / 150 / 300 / 600 / 1300 / 2500, and the four
extra rows at levels 2 and 3 are headwords the list splits by reading. Level 4 is exact.

Since then the transcription has also been checked against Hanban's own file (see
_HSK 2.0 — 1,300 words_ below): its Level 4 holds the same 600 headwords, the official
file differing only in tagging two of them with a part of speech (`得（助动词）`, `等（助词）`).

A second candidate, [`drkameleon/complete-hsk-vocabulary`](https://github.com/drkameleon/complete-hsk-vocabulary),
was rejected: its "old" Level 4 holds 598 words and diverges from the official list by 90
in each direction, with 55 words the 2012 syllabus places at Level 4 moved to Level 5 and
lexical substitutions (弹 for 弹钢琴, 刚刚 for 刚, 研究生 for 研究). It is a reconciled
list, not a transcription of the 2012 one.

**Recovering the dictionary key.** The 2012 list's numeric-pinyin column is not
trustworthy: it drops neutral tones (`包子` is written `bao1zi`) and contains
transcription errors (`参观` is written `cang1uan1`). Only its tone-marked column is
used. The CC-CEDICT reading is recovered by rendering each CC-CEDICT reading of the same
Hanzi as tone-marked pinyin and keeping the one that matches — a direction that is
deterministic, unlike parsing syllable boundaries out of an unspaced romanisation. Where
the list writes tone sandhi (`búguò` for `bùguò`) or a neutral-tone variant (`fùqin` for
`fùqīn`), the match falls back to comparing syllables with the tones stripped. 594 of the
600 rows match on the strict comparison; 5 need the fallback; 1 has no dictionary entry
at all and is hand-glossed.

### HSK 2.0 Level 5 — 1,300 words

**Authority:** `新汉语水平考试大纲 HSK五级`, Hanban, 2012 edition. Level 5 introduces
1,300 words on top of the 1,200 of HSK 1–4, for the 2,500 the exam is described as
requiring. `hsk5-2.0.csv` is seeded but has no page yet — see
[`../data/README.md`](../data/README.md).

**Official file, archived.** Hanban published the 2012 revision as a spreadsheet at
`http://www.chinesetest.cn/userfiles/file/HSK/HSK-2012.xls`. The live URL is gone, but the
Internet Archive holds it from 2013 to 2021:
<https://web.archive.org/web/20210423042835id_/http://www.chinesetest.cn/userfiles/file/HSK/HSK-2012.xls>.
Its sheet `新HSK5000词` tags each of the 5,000 headwords with exactly one level
(150 / 150 / 300 / 600 / **1300** / 2500); the cumulative sheets `新HSK（四级）（1200）` and
`新HSK（五级）（2500）` agree with those tags.

**Machine-readable transcription:** `glxxyz/hskhsk.com`, file
`data/lists/HSK Official With Definitions 2012 L5.txt` — the same source and format as the
Level 4 deck, read by the same code path. The spreadsheet carries Hanzi only, so the
transcription is what supplies tone-marked pinyin.

We verified it before use (2026-10-15):

- `glxxyz` keeps a copy of the spreadsheet as `data/lists/HSK-2012.xls`; it is
  byte-identical to the archived official file (SHA-256 `164ab0b7…a802d`).
- The transcription's 1,300 Level 5 headwords equal the spreadsheet's `（五级）` tags —
  same words, same order — and equal `五级` minus `四级` from the cumulative sheets.
- None of them repeats a Level 4 headword.

Two other lists were rejected. [`clem109/hsk-vocabulary`](https://github.com/clem109/hsk-vocabulary)
and `drkameleon/complete-hsk-vocabulary` ("old" Level 5) each differ from the official
2012 Level 5 by 174 words in each direction. They follow the **2010** list (`glxxyz`
`New_HSK_2010.csv`) that the 2012 revision replaced: of the 2010 Level 5 words missing
from 2012 Level 5, 141 moved to another level and 40 were dropped or reworded
(一路平安 → 平安, 健身房 → 健身, 小偷 → 偷).

1,295 rows resolve to a dictionary entry through their own reading, 10 of them under two
readings (`数 shù, shǔ`). The five that do not are listed under _Known editorial
decisions_ in `data/README.md`.

## English meanings

**Source:** [CC-CEDICT](https://cc-cedict.org/editor/editor.php?handler=Download),
published by MDBG, licensed **CC BY-SA 4.0**. Release used: `2026-09-15`.

Entries are matched on simplified Hanzi plus numeric pinyin so that a word is resolved to
its _term-level_ entry rather than to a character-level definition. Senses are kept in
CC-CEDICT order and truncated to the leading senses so a flashcard stays readable; the
separator is `;`.

## Indonesian meanings

**Source:** [CC-CIDICT](https://cidict.org/download/), version 1.26 (released
2026-08-26), published by Harmony Mandarin, licensed **CC BY-SA 4.0**.

CC-CIDICT is a Chinese–Indonesian dictionary derived from CC-CEDICT and translated by the
Harmony Mandarin editorial team and volunteer editors. It is matched with the same
Hanzi + numeric-pinyin key as CC-CEDICT, so the Indonesian and English glosses on a card
describe the same dictionary sense.

Indonesian glosses are **not** machine-translated by this project. Where CC-CIDICT has no
entry, the gloss is hand-authored and marked in `data/README.md`; those rows are the only
ones in either file whose Indonesian text does not carry dictionary provenance.

## What is filtered out of a gloss

Both dictionaries carry bookkeeping alongside their translations. A card shows meanings
only, so three kinds of sense are dropped:

- **Classifier lists** — tagged `CL:` by CC-CEDICT and `KP:`, `KH:` or `SM:` by
  CC-CIDICT, whether they stand as a sense of their own or ride inside one
  (`cutlass (CL:把)`). These are the only all-caps tags in either corpus.
- **Cross-references** — `variant of`, `old variant of`, `erhua variant of`,
  `varian dari`, `varian lama dari` and their siblings, plus `see` / `lihat`. They point
  at another headword instead of translating this one.
- **Pronunciation notes** — `also pr.`, `Taiwan pr.`, `colloquial pr.`, `juga dibaca`,
  `Taiwan dibaca`, `bahasa sehari-hari dibaca`.

The same notes also trail a real meaning in parentheses — `classifier for horses (Taiwan
pr. [pi1])`, `inscribed bamboo stick (variant of 籤|签[qian1])` — and there only the
parenthetical is removed. Adding this rule for Level 5 also cleaned one Level 4 row:
尾巴 in `hsk4-3.0.csv` used to end in a bare `colloquial pr.` sense.

A sense is tested for a classifier tag **before** the traditional-vs-simplified reference
stripper runs, because that stripper rewrites `CL:個|个[ge4]` to a bare `个` and would
otherwise hide the tag that identifies it.

## Share-alike obligation

Both CC-CEDICT and CC-CIDICT are CC BY-SA 4.0. Every CSV in `data/` is a derivative of
both, so **all datasets are redistributed under CC BY-SA 4.0**, with attribution preserved in [`../ATTRIBUTION.md`](../ATTRIBUTION.md)
and surfaced in the application at `/about`. The application source code is licensed
separately; the share-alike term attaches to the datasets, not to the surrounding code.

## Verification date

`verified_at` on each row records the date the reproduction pipeline was last run and its
output validated by `npm run data:validate` — that is, the date on which the row's
Hanzi, pinyin, English and Indonesian fields were confirmed non-empty, uniquely keyed and
resolved against the named dictionary release. It is not a claim that a human read every
row individually.

Because a rebuild resolves glosses against whatever CC-CEDICT and CC-CIDICT have published
by then, a row's meaning can change without its word list changing. `verified_at` moves
with the rebuild, not with the syllabus; `source_version` is what tracks the syllabus.

## Reproducing the files

See [`../data/README.md`](../data/README.md) for the exact commands.
