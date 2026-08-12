import { useMemo, useState } from "react"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { searchVocabulary } from "@/features/vocabulary/normalize"
import type { VocabularyItem } from "@/features/vocabulary/types"

/** The manual entries, searchable with the same matcher the public list uses. */
export function AdminVocabularyTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Array<VocabularyItem>
  onEdit: (item: VocabularyItem) => void
  onDelete: (item: VocabularyItem) => void
}) {
  const [query, setQuery] = useState("")
  const results = useMemo(() => searchVocabulary(items, query), [items, query])

  if (items.length === 0) {
    return (
      <EmptyState
        title="Belum ada kata manual"
        description="Kata yang kamu tambahkan sendiri akan muncul di sini. Kata resmi dari silabus tidak bisa diubah."
      />
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-foreground pb-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Cari kata manual"
          placeholder="Cari kata manual…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <p className="eyebrow text-muted-foreground">
          {results.length} kata manual
        </p>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada kata manual yang cocok dengan “{query.trim()}”.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hanzi</TableHead>
                <TableHead>Pinyin</TableHead>
                <TableHead>Arti Indonesia</TableHead>
                <TableHead>Arti Inggris</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="hanzi text-xl">{item.hanzi}</TableCell>
                  <TableCell>{item.pinyin}</TableCell>
                  <TableCell>{item.translationId}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.translationEn}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(item)}
                      aria-label={`Ubah ${item.hanzi}`}
                    >
                      Ubah
                    </Button>{" "}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(item)}
                      aria-label={`Hapus ${item.hanzi}`}
                    >
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
