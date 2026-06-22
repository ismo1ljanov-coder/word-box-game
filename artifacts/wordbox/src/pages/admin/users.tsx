import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ChevronLeft, ChevronRight, Ban, Trash2, RotateCcw, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: number;
  phone: string;
  fullName: string;
  subscriptionTier: "free" | "premium" | "pro";
  isAdmin: boolean;
  isBanned: boolean;
  streakDays: number;
  totalXp: number;
  totalCoins: number;
  createdAt: string | null;
  lastActiveAt: string | null;
}

interface UserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

async function fetchUsers(page: number, search: string): Promise<UserListResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (search) params.set("search", search);
  const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function banUser(id: number) {
  const res = await fetch(`/api/admin/users/${id}/ban`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error("Ban failed");
  return res.json();
}

async function resetProgress(id: number) {
  const res = await fetch(`/api/admin/users/${id}/reset-progress`, { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error("Reset failed");
  return res.json();
}

async function deleteUser(id: number) {
  const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

async function grantTier(id: number, tier: string) {
  const res = await fetch(`/api/admin/users/${id}/grant-premium`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) throw new Error("Grant failed");
  return res.json();
}

async function updateUserName(id: number, fullName: string) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullName }),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function InlineNameEdit({
  userId,
  initialName,
  onSave,
}: {
  userId: number;
  initialName: string;
  onSave: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: () => updateUserName(userId, value.trim()),
    onSuccess: () => { setEditing(false); onSave(); },
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-1 group">
        <span className="font-medium">{initialName}</span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { setValue(initialName); setEditing(true); }}
          title="Ismni tahrirlash"
        >
          <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim().length >= 2) mut.mutate();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 w-36 text-xs"
        autoFocus
      />
      <Button
        size="icon" variant="ghost" className="h-6 w-6 text-green-600"
        onClick={() => { if (value.trim().length >= 2) mut.mutate(); }}
        disabled={mut.isPending || value.trim().length < 2}
      >
        <Check className="w-3 h-3" />
      </Button>
      <Button
        size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground"
        onClick={() => setEditing(false)}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search],
    queryFn: () => fetchUsers(page, search),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const banMut = useMutation({ mutationFn: banUser, onSuccess: invalidate, onError: () => toast({ title: "Xatolik", variant: "destructive" }) });
  const resetMut = useMutation({ mutationFn: resetProgress, onSuccess: () => { invalidate(); toast({ title: "Progressi o'chirildi" }); }, onError: () => toast({ title: "Xatolik", variant: "destructive" }) });
  const deleteMut = useMutation({ mutationFn: deleteUser, onSuccess: () => { invalidate(); toast({ title: "Foydalanuvchi o'chirildi" }); }, onError: () => toast({ title: "Xatolik", variant: "destructive" }) });
  const tierMut = useMutation({ mutationFn: ({ id, tier }: { id: number; tier: string }) => grantTier(id, tier), onSuccess: invalidate, onError: () => toast({ title: "Xatolik", variant: "destructive" }) });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Foydalanuvchilar</h1>
        <p className="text-muted-foreground mt-1">{data ? `Jami: ${data.total} ta` : ""}</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Ism yoki telefon..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          />
        </div>
        <Button variant="outline" onClick={() => { setSearch(searchInput); setPage(1); }}>Qidirish</Button>
        {search && <Button variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>Tozalash</Button>}
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
                    <th className="text-left px-4 py-3 font-semibold">Ism</th>
                    <th className="text-left px-4 py-3 font-semibold">Telefon</th>
                    <th className="text-left px-4 py-3 font-semibold">Tarif</th>
                    <th className="text-left px-4 py-3 font-semibold">XP</th>
                    <th className="text-left px-4 py-3 font-semibold">Seriya</th>
                    <th className="text-left px-4 py-3 font-semibold">Qo'shilgan</th>
                    <th className="text-left px-4 py-3 font-semibold">Faollik</th>
                    <th className="text-left px-4 py-3 font-semibold">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((user) => (
                    <tr key={user.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${user.isBanned ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <InlineNameEdit
                            userId={user.id}
                            initialName={user.fullName}
                            onSave={invalidate}
                          />
                          <div className="flex gap-1">
                            {user.isAdmin && <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">Admin</Badge>}
                            {user.isBanned && <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-red-500 border-red-300">Bloklangan</Badge>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.phone}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={user.subscriptionTier}
                          onValueChange={(tier) => tierMut.mutate({ id: user.id, tier })}
                          disabled={user.isAdmin}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{user.totalXp.toLocaleString()}</td>
                      <td className="px-4 py-3">{user.streakDays} kun</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(user.lastActiveAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {!user.isAdmin && (
                            <>
                              <Button
                                size="icon" variant="ghost"
                                className={`h-7 w-7 ${user.isBanned ? "text-green-500" : "text-orange-500"}`}
                                onClick={() => banMut.mutate(user.id)}
                                title={user.isBanned ? "Blokni ochish" : "Bloklash"}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" title="Progressni o'chirish">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Progressni o'chirish</AlertDialogTitle>
                                    <AlertDialogDescription>{user.fullName} foydalanuvchisining barcha o'rganish progressi o'chiriladi. Bu amalni qaytarib bo'lmaydi.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => resetMut.mutate(user.id)} className="bg-blue-500 hover:bg-blue-600">O'chirish</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Foydalanuvchini o'chirish">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Foydalanuvchini o'chirish</AlertDialogTitle>
                                    <AlertDialogDescription>{user.fullName} foydalanuvchisi va uning barcha ma'lumotlari butunlay o'chiriladi.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMut.mutate(user.id)} className="bg-destructive hover:bg-destructive/90">O'chirish</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
