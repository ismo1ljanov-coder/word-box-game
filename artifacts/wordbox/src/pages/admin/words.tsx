import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Pencil, Check, X, Download, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700 border-emerald-200",
  A2: "bg-teal-100 text-teal-700 border-teal-200",
  B1: "bg-blue-100 text-blue-700 border-blue-200",
  B2: "bg-violet-100 text-violet-700 border-violet-200",
  C1: "bg-orange-100 text-orange-700 border-orange-200",
  C2: "bg-red-100 text-red-700 border-red-200",
};

interface Word {
  id: number;
  word: string;
  translation: string;
  level: string;
  category: string;
  partOfSpeech: string | null;
  exampleSentence: string | null;
  exampleTranslation: string | null;
  phonetic: string | null;
}

interface WordListResponse { items: Word[]; total: number; page: number; pageSize: number; }

async function fetchWords(page: number, search: string, level: string): Promise<WordListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: "50" });
  if (search) params.set("search", search);
  if (level) params.set("level", level);
  const res = await fetch(`/api/admin/words?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function updateWord(id: number, data: Partial<Word>) {
  const res = await fetch(`/api/admin/words/${id}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

async function importCsv(text: string) {
  const res = await fetch("/api/admin/words/import-csv", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "text/csv" },
    body: text,
  });
  if (!res.ok) throw new Error("Import failed");
  return res.json();
}

type EditState = { id: number; word: string; translation: string; level: string; category: string; partOfSpeech: string };

export default function AdminWords() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [editing, setEditing] = useState<EditState | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-words", page, search, levelFilter],
    queryFn: () => fetchWords(page, search, levelFilter),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Word> }) => updateWord(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-words"] }); setEditing(null); },
    onError: () => toast({ title: "Yangilashda xatolik", variant: "destructive" }),
  });

  const importMut = useMutation({
    mutationFn: importCsv,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-words"] });
      toast({ title: `${res.imported} ta so'z import qilindi`, description: res.errors.length > 0 ? `${res.errors.length} xatolik` : undefined });
    },
    onError: () => toast({ title: "Import xatoligi", variant: "destructive" }),
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { importMut.mutate(ev.target?.result as string); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExport = () => {
    window.open("/api/admin/words/export-csv", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black">So'zlar</h1>
          <p className="text-muted-foreground mt-1">{data ? `Jami: ${data.total} ta` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />CSV yuklab olish
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
            <Upload className="w-4 h-4 mr-2" />
            {importMut.isPending ? "Yuklanmoqda..." : "CSV import"}
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="So'z yoki tarjima..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }} />
        </div>
        <Select value={levelFilter || "all"} onValueChange={(v) => { setLevelFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Daraja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barchasi</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setSearch(searchInput); setPage(1); }}>Qidirish</Button>
      </div>

      <Card className="rounded-2xl border-none shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Yuklanmoqda...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold">So'z</th>
                    <th className="text-left px-4 py-3 font-semibold">Tarjima</th>
                    <th className="text-left px-4 py-3 font-semibold">Daraja</th>
                    <th className="text-left px-4 py-3 font-semibold">Kategoriya</th>
                    <th className="text-left px-4 py-3 font-semibold">So'z turi</th>
                    <th className="text-left px-4 py-3 font-semibold">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((word) => {
                    const isEditing = editing?.id === word.id;
                    return (
                      <tr key={word.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <Input className="h-7 text-sm" value={editing.word} onChange={(e) => setEditing({ ...editing, word: e.target.value })} />
                          ) : (
                            <span className="font-medium">{word.word}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <Input className="h-7 text-sm" value={editing.translation} onChange={(e) => setEditing({ ...editing, translation: e.target.value })} />
                          ) : (
                            <span className="text-muted-foreground">{word.translation}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <Select value={editing.level} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold border ${LEVEL_COLORS[word.level]}`}>{word.level}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <Input className="h-7 text-sm" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                          ) : (
                            <span className="text-muted-foreground">{word.category}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <Input className="h-7 text-sm" value={editing.partOfSpeech} onChange={(e) => setEditing({ ...editing, partOfSpeech: e.target.value })} placeholder="noun, verb..." />
                          ) : (
                            <span className="text-muted-foreground text-xs">{word.partOfSpeech ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                                onClick={() => updateMut.mutate({ id: word.id, data: { word: editing.word, translation: editing.translation, level: editing.level, category: editing.category, partOfSpeech: editing.partOfSpeech || undefined } })}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditing(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => setEditing({ id: word.id, word: word.word, translation: word.translation, level: word.level, category: word.category, partOfSpeech: word.partOfSpeech ?? "" })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data ? `${(page - 1) * data.pageSize + 1}–${Math.min(page * data.pageSize, data.total)} / ${data.total}` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3 py-1.5">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
