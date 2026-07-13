"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Edit3, Eye, EyeOff, Pause, Play, Plus, Star, Trash2, Upload } from "lucide-react";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { PublicImage } from "@/components/public-image";
import { AdminRequiredLabel } from "@/components/admin-required-label";

type MusicTrackRow = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  description: string | null;
  coverImage: string | null;
  audioUrl: string;
  sourceUrl: string | null;
  license: string | null;
  category: string | null;
  duration: number | null;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  playCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const emptyForm = {
  title: "",
  artist: "",
  album: "",
  description: "",
  coverImage: "",
  audioUrl: "",
  sourceUrl: "",
  license: "",
  category: "",
  duration: "",
  sortOrder: "0",
  isPublished: false,
  isFeatured: false
};

export function AdminMusicClient({
  items,
  total,
  page,
  pageSize,
  totalPages
}: {
  items: MusicTrackRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function updateQuery(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.set("page", "1");
    router.push(`/admin/music?${next.toString()}`);
  }

  function edit(item: MusicTrackRow) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      artist: item.artist || "",
      album: item.album || "",
      description: item.description || "",
      coverImage: item.coverImage || "",
      audioUrl: item.audioUrl,
      sourceUrl: item.sourceUrl || "",
      license: item.license || "",
      category: item.category || "",
      duration: item.duration ? String(item.duration) : "",
      sortOrder: String(item.sortOrder),
      isPublished: item.isPublished,
      isFeatured: item.isFeatured
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function payload() {
    return {
      title: form.title,
      artist: form.artist || null,
      album: form.album || null,
      description: form.description || null,
      coverImage: form.coverImage || null,
      audioUrl: form.audioUrl,
      sourceUrl: form.sourceUrl || null,
      license: form.license || null,
      category: form.category || null,
      duration: form.duration ? Number(form.duration) : null,
      sortOrder: Number(form.sortOrder || 0),
      isPublished: form.isPublished,
      isFeatured: form.isFeatured
    };
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const res = await fetch(editingId ? `/api/admin/music/${editingId}` : "/api/admin/music", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload())
    });
    const body = await res.json();
    setMessage(res.ok ? (editingId ? "音乐已更新" : "音乐已创建") : body.error?.message || "保存失败");
    if (res.ok) {
      reset();
      router.refresh();
    }
  }

  async function patch(id: string, data: Partial<MusicTrackRow>) {
    const res = await fetch(`/api/admin/music/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => null);
    setMessage(res.ok ? "已更新" : body?.error?.message || "更新失败");
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("确认软删除该音乐？")) return;
    const res = await fetch(`/api/admin/music/${id}`, { method: "DELETE" });
    const body = await res.json().catch(() => null);
    setMessage(res.ok ? "音乐已删除" : body?.error?.message || "删除失败");
    if (res.ok) router.refresh();
  }

  function preview(item: MusicTrackRow) {
    const audio = audioRef.current;
    if (!audio) return;
    if (previewId === item.id && !audio.paused) {
      audio.pause();
      setPreviewId(null);
      return;
    }
    audio.src = item.audioUrl;
    audio.play().then(() => setPreviewId(item.id)).catch(() => setMessage("音频加载失败"));
  }

  async function uploadCover(file: File | null) {
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/uploads", { method: "POST", body });
    const data = await res.json().catch(() => null);
    setUploading(false);
    if (res.ok && data?.data?.url) {
      setForm((old) => ({ ...old, coverImage: data.data.url }));
      setMessage("封面已上传");
    } else {
      setMessage(data?.error?.message || "封面上传失败");
    }
  }

  return (
    <div className="admin-stack">
      <audio ref={audioRef} onEnded={() => setPreviewId(null)} />
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">背景音乐</p>
          <h2 className="text-2xl font-semibold">音乐管理</h2>
        </div>
        {message && <span className="status-pill">{message}</span>}
      </div>

      <div className="admin-panel text-sm muted">
        请只上传或填写你有权使用、公开授权或允许外链播放的音频资源。不要上传或引用未经授权的商业音乐。
      </div>

      <form onSubmit={save} className="admin-panel grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1.5">
          <AdminRequiredLabel required>歌曲标题</AdminRequiredLabel>
          <input className="input" required placeholder="歌曲标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>作者 / 歌手</AdminRequiredLabel>
          <input className="input" placeholder="作者 / 歌手" value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>专辑</AdminRequiredLabel>
          <input className="input" placeholder="专辑" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>分类</AdminRequiredLabel>
          <input className="input" placeholder="分类" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </label>
        <label className="grid gap-1.5 lg:col-span-2">
          <AdminRequiredLabel required>音频 URL</AdminRequiredLabel>
          <input className="input" required placeholder="音频 URL（http/https）" value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
        </label>
        <div className="grid gap-1.5 lg:col-span-2">
          <AdminRequiredLabel>封面图</AdminRequiredLabel>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="input" placeholder="封面图 URL" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} />
            <label className="btn">
              <Upload className="size-4" />
              {uploading ? "上传中" : "上传封面"}
              <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => uploadCover(e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>来源 URL</AdminRequiredLabel>
          <input className="input" placeholder="来源 URL" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>授权说明 / license</AdminRequiredLabel>
          <input className="input" placeholder="授权说明 / license" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>时长（秒）</AdminRequiredLabel>
          <input className="input" type="number" min={0} placeholder="时长（秒）" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
        </label>
        <label className="grid gap-1.5">
          <AdminRequiredLabel>排序值</AdminRequiredLabel>
          <input className="input" type="number" min={0} placeholder="排序值" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        </label>
        <label className="grid gap-1.5 lg:col-span-2">
          <AdminRequiredLabel>简介</AdminRequiredLabel>
          <textarea className="input min-h-24 py-3" placeholder="简介" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
          发布
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
          首页推荐
        </label>
        <div className="flex flex-wrap gap-2 lg:col-span-2">
          <button className="btn btn-primary">
            <Plus className="size-4" />
            {editingId ? "保存音乐" : "新增音乐"}
          </button>
          {editingId && (
            <button type="button" className="btn" onClick={reset}>
              取消编辑
            </button>
          )}
        </div>
      </form>

      <div className="admin-panel grid gap-3 lg:grid-cols-5">
        <input className="input" placeholder="关键词搜索" defaultValue={searchParams.get("keyword") || ""} onBlur={(e) => updateQuery("keyword", e.target.value)} />
        <input className="input" placeholder="分类筛选" defaultValue={searchParams.get("category") || ""} onBlur={(e) => updateQuery("category", e.target.value)} />
        <select className="input" value={searchParams.get("published") || ""} onChange={(e) => updateQuery("published", e.target.value)}>
          <option value="">发布不限</option>
          <option value="true">已发布</option>
          <option value="false">未发布</option>
        </select>
        <select className="input" value={searchParams.get("featured") || ""} onChange={(e) => updateQuery("featured", e.target.value)}>
          <option value="">推荐不限</option>
          <option value="true">已推荐</option>
          <option value="false">未推荐</option>
        </select>
        <select className="input" value={pageSize} onChange={(e) => updateQuery("pageSize", e.target.value)}>
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </select>
      </div>

      <div className="admin-panel overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>封面</th>
              <th>歌曲</th>
              <th>分类</th>
              <th>状态</th>
              <th>数据</th>
              <th>更新</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <PublicImage src={item.coverImage || "/images/default-cover.svg"} alt="" width={74} height={42} className="aspect-video rounded object-cover" />
                </td>
                <td>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs muted">{item.artist || "未知作者"}</div>
                </td>
                <td>{item.category || "-"}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <span className="status-pill">{item.isPublished ? "已发布" : "未发布"}</span>
                    {item.isFeatured && <span className="status-pill">首页推荐</span>}
                  </div>
                </td>
                <td className="text-xs muted">{item.playCount} 播放<br />排序 {item.sortOrder}</td>
                <td className="text-xs muted">{new Date(item.updatedAt).toLocaleString("zh-CN")}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn size-9 p-0" onClick={() => preview(item)} title="预览播放">
                      {previewId === item.id ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <button className="btn size-9 p-0" onClick={() => edit(item)} title="编辑">
                      <Edit3 className="size-4" />
                    </button>
                    <button className="btn size-9 p-0" onClick={() => patch(item.id, { isPublished: !item.isPublished })} title={item.isPublished ? "禁用" : "启用"}>
                      {item.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button className="btn size-9 p-0" onClick={() => patch(item.id, { isFeatured: !item.isFeatured })} title="首页推荐">
                      <Star className={item.isFeatured ? "size-4 text-yellow-500" : "size-4"} />
                    </button>
                    <button className="btn size-9 p-0" onClick={() => remove(item.id)} title="删除">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="py-12 text-center muted">暂无音乐</div>}
      </div>

      <div className="admin-panel flex flex-wrap items-center justify-between gap-3">
        <span className="muted">共 {total} 条，第 {page} / {totalPages} 页</span>
        <div className="flex items-center gap-2">
          <button className="btn" disabled={page <= 1} onClick={() => updateQuery("page", String(page - 1))}>
            上一页
          </button>
          <button className="btn" disabled={page >= totalPages} onClick={() => updateQuery("page", String(page + 1))}>
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
