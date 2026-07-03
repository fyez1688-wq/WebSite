"use client";

import type { Category, Content, ContentResourceDetail, ContentTag, Tag } from "@prisma/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bold, Code, Eye, Heading, ImagePlus, Italic, LinkIcon, List, ListOrdered, Quote, Redo2, Save, Strikethrough, Undo2 } from "lucide-react";

type ContentWithRelations = Content & {
  tags: (ContentTag & { tag: Tag })[];
  resourceDetail: ContentResourceDetail | null;
};

const contentTypes = [
  ["ARTICLE", "技术文章"],
  ["LEARNING_RESOURCE", "学习资料"],
  ["SOFTWARE", "软件资源"],
  ["WEBSITE", "实用网站"],
  ["DOWNLOAD", "下载资源"],
  ["OTHER", "其他收藏"]
];

export function AdminContentForm({
  mode,
  content,
  categories,
  tags
}: {
  mode: "create" | "edit";
  content?: ContentWithRelations;
  categories: Category[];
  tags: Tag[];
}) {
  const router = useRouter();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [id, setId] = useState(content?.id || "");
  const [title, setTitle] = useState(content?.title || "");
  const [slug, setSlug] = useState(content?.slug || "");
  const [summary, setSummary] = useState(content?.summary || "");
  const [body, setBody] = useState(content?.content || "");
  const [contentType, setContentType] = useState(content?.contentType || "ARTICLE");
  const [coverImage, setCoverImage] = useState(content?.coverImage || "");
  const [status, setStatus] = useState(content?.status || "DRAFT");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState("已保存");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(content?.updatedAt ? new Date(content.updatedAt).toISOString() : undefined);

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void save("DRAFT", true);
    }, 4000);
    return () => window.clearTimeout(timer);
  });

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function collect(statusValue: string) {
    const form = document.querySelector<HTMLFormElement>("#content-form");
    const formData = new FormData(form || undefined);
    const tagIds = formData.getAll("tagIds").map(String);
    return {
      title,
      slug: slug || makeSlug(title),
      summary,
      content: body,
      coverImage: coverImage || null,
      contentType,
      categoryId: formData.get("categoryId") || null,
      tagIds,
      status: statusValue,
      isFeatured: formData.get("isFeatured") === "on",
      isPinned: formData.get("isPinned") === "on",
      allowFavorite: formData.get("allowFavorite") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
      seoTitle: formData.get("seoTitle") || null,
      seoDescription: formData.get("seoDescription") || null,
      seoKeywords: formData.get("seoKeywords") || null,
      ogTitle: formData.get("ogTitle") || null,
      ogDescription: formData.get("ogDescription") || null,
      ogImage: formData.get("ogImage") || null,
      canonicalUrl: formData.get("canonicalUrl") || null,
      resourceDetail: {
        softwareName: formData.get("softwareName") || null,
        softwareVersion: formData.get("softwareVersion") || null,
        supportedSystems: formData.get("supportedSystems") || null,
        fileSize: formData.get("fileSize") || null,
        officialUrl: formData.get("officialUrl") || null,
        downloadUrl: formData.get("downloadUrl") || null,
        extractionCode: formData.get("extractionCode") || null,
        installGuide: formData.get("installGuide") || null,
        requireLoginToDownload: formData.get("requireLoginToDownload") === "on",
        showDownloadCount: formData.get("showDownloadCount") === "on"
      },
      lastUpdatedAt
    };
  }

  async function save(statusValue = status, auto = false) {
    if (!title.trim() && !auto) {
      setSaveState("标题不能为空");
      return;
    }
    setSaveState("正在保存...");
    const payload = collect(statusValue);
    const endpoint = id ? `/api/admin/contents/${id}` : "/api/admin/contents";
    const res = await fetch(endpoint, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok) {
      setSaveState(result.error?.message || "保存失败");
      return;
    }
    const next = result.data.content;
    setId(next.id);
    setLastUpdatedAt(new Date(next.updatedAt).toISOString());
    setDirty(false);
    setSaveState(auto ? "草稿已自动保存" : "已保存");
    if (mode === "create") router.replace(`/admin/content/${next.id}/edit`);
    router.refresh();
  }

  async function upload(file: File) {
    setSaveState("正在上传封面...");
    const form = new FormData();
    form.set("file", file);
    const res = await fetch("/api/admin/uploads", { method: "POST", body: form });
    const result = await res.json();
    if (res.ok) {
      setCoverImage(result.data.url);
      setDirty(true);
      setSaveState("封面已上传");
    } else {
      setSaveState(result.error?.message || "上传失败");
    }
  }

  function insert(prefix: string, suffix = "") {
    const el = textRef.current;
    if (!el) return;
    const before = body.slice(0, el.selectionStart);
    const selected = body.slice(el.selectionStart, el.selectionEnd);
    const after = body.slice(el.selectionEnd);
    setBody(`${before}${prefix}${selected || "文本"}${suffix}${after}`);
    setDirty(true);
  }

  const showResource = contentType === "SOFTWARE" || contentType === "DOWNLOAD";
  const detail = content?.resourceDetail;

  return (
    <form id="content-form" className="admin-stack" onChange={() => setDirty(true)}>
      <div className="admin-title-row">
        <div>
          <p className="admin-kicker">内容编辑</p>
          <h2 className="text-2xl font-semibold">{mode === "create" ? "新建内容" : "编辑内容"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="status-pill">{saveState}</span>
          {id && <a className="btn" href={`/admin/content/${id}/preview`} target="_blank"><Eye className="size-4" />预览</a>}
          <button type="button" className="btn" onClick={() => save("DRAFT")}><Save className="size-4" />保存草稿</button>
          <button type="button" className="btn btn-primary" onClick={() => save("PUBLISHED")}>发布</button>
          {id && <button type="button" className="btn" onClick={() => save("OFFLINE")}>下架</button>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="admin-stack">
          <section className="admin-panel grid gap-3">
            <h3 className="font-semibold">基本信息</h3>
            <input className="input" value={title} onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(makeSlug(e.target.value)); setDirty(true); }} placeholder="内容标题" maxLength={120} />
            <input className="input" value={slug} onChange={(e) => { setSlug(e.target.value); setDirty(true); }} placeholder="slug，如 nextjs-guide" />
            <textarea className="input min-h-24 py-3" value={summary} onChange={(e) => { setSummary(e.target.value); setDirty(true); }} maxLength={500} placeholder="内容简介" />
            <p className="text-right text-xs muted">{summary.length}/500</p>
            <MarkdownToolbar insert={insert} />
            <textarea ref={textRef} className="input min-h-[420px] py-3 font-mono text-sm" value={body} onChange={(e) => { setBody(e.target.value); setDirty(true); }} placeholder="正文内容，支持 Markdown" />
          </section>

          <section className="admin-panel grid gap-3">
            <h3 className="font-semibold">SEO 设置</h3>
            <input className="input" name="seoTitle" defaultValue={content?.seoTitle || ""} placeholder="SEO标题，默认使用内容标题" />
            <textarea className="input min-h-20 py-3" name="seoDescription" defaultValue={content?.seoDescription || ""} placeholder="SEO描述，默认使用简介" />
            <input className="input" name="seoKeywords" defaultValue={content?.seoKeywords || ""} placeholder="SEO关键词" />
            <input className="input" name="ogTitle" defaultValue={content?.ogTitle || ""} placeholder="Open Graph标题" />
            <input className="input" name="ogDescription" defaultValue={content?.ogDescription || ""} placeholder="Open Graph描述" />
            <input className="input" name="ogImage" defaultValue={content?.ogImage || ""} placeholder="Open Graph图片" />
            <input className="input" name="canonicalUrl" defaultValue={content?.canonicalUrl || ""} placeholder="canonical地址" />
          </section>
        </div>

        <aside className="admin-stack">
          <section className="admin-panel grid gap-3">
            <h3 className="font-semibold">发布设置</h3>
            <select className="input" value={contentType} onChange={(e) => { setContentType(e.target.value as typeof contentType); setDirty(true); }}>
              {contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="input" name="categoryId" defaultValue={content?.categoryId || ""}>
              <option value="">选择分类</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="grid max-h-40 gap-2 overflow-auto rounded border border-[var(--border)] p-3">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="tagIds" value={tag.id} defaultChecked={content?.tags.some((item) => item.tagId === tag.id)} />
                  {tag.name}
                </label>
              ))}
            </div>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setDirty(true); }}>
              <option value="DRAFT">草稿</option>
              <option value="PUBLISHED">已发布</option>
              <option value="OFFLINE">已下架</option>
            </select>
            <input className="input" name="sortOrder" type="number" min={0} defaultValue={content?.sortOrder || 0} placeholder="人工排序值" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={content?.isFeatured} /> 推荐</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPinned" defaultChecked={content?.isPinned} /> 置顶</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="allowFavorite" defaultChecked={content?.allowFavorite ?? true} /> 允许收藏</label>
          </section>

          <section className="admin-panel grid gap-3">
            <h3 className="font-semibold">封面图片</h3>
            {coverImage && <Image src={coverImage} alt="" width={640} height={360} className="aspect-video w-full rounded object-cover" />}
            <input className="input" value={coverImage} onChange={(e) => { setCoverImage(e.target.value); setDirty(true); }} placeholder="封面地址" />
            <label className="btn cursor-pointer">
              <ImagePlus className="size-4" />
              上传封面
              <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
          </section>

          {showResource && (
            <section className="admin-panel grid gap-3">
              <h3 className="font-semibold">资源扩展</h3>
              <input className="input" name="softwareName" defaultValue={detail?.softwareName || ""} placeholder="软件名称" />
              <input className="input" name="softwareVersion" defaultValue={detail?.softwareVersion || ""} placeholder="软件版本" />
              <input className="input" name="supportedSystems" defaultValue={detail?.supportedSystems || ""} placeholder="支持系统" />
              <input className="input" name="fileSize" defaultValue={detail?.fileSize || ""} placeholder="文件大小" />
              <input className="input" name="officialUrl" defaultValue={detail?.officialUrl || ""} placeholder="官方网站" />
              <input className="input" name="downloadUrl" defaultValue={detail?.downloadUrl || ""} placeholder="下载地址" />
              <input className="input" name="extractionCode" defaultValue={detail?.extractionCode || ""} placeholder="提取码" />
              <textarea className="input min-h-24 py-3" name="installGuide" defaultValue={detail?.installGuide || ""} placeholder="安装说明" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requireLoginToDownload" defaultChecked={detail?.requireLoginToDownload} /> 登录后下载</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showDownloadCount" defaultChecked={detail?.showDownloadCount ?? true} /> 显示下载次数</label>
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}

function MarkdownToolbar({ insert }: { insert: (prefix: string, suffix?: string) => void }) {
  const buttons = [
    [Heading, "标题", "## "],
    [Bold, "加粗", "**", "**"],
    [Italic, "斜体", "*", "*"],
    [Strikethrough, "删除线", "~~", "~~"],
    [List, "无序列表", "\n- "],
    [ListOrdered, "有序列表", "\n1. "],
    [Quote, "引用", "\n> "],
    [Code, "代码块", "\n```ts\n", "\n```"],
    [LinkIcon, "链接", "[", "](https://)"],
    [Undo2, "分割线", "\n\n---\n\n"],
    [Redo2, "行内代码", "`", "`"]
  ] as const;
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map(([Icon, title, prefix, suffix]) => (
        <button key={title} type="button" className="btn size-9 p-0" title={title} onClick={() => insert(prefix, suffix)}>
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function makeSlug(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `content-${Date.now().toString(36)}`;
}
