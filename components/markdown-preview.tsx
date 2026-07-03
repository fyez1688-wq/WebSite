import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "hr" }
  | { type: "code"; language: string; code: string };

function safeUrl(value: string) {
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!?\[([^\]]*)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1]?.startsWith("!")) {
      nodes.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={match.index} src={safeUrl(match[3])} alt={match[2]} className="my-3 max-h-80 rounded border border-[var(--border)] object-contain" />
      );
    } else if (match[1]) {
      nodes.push(
        <a key={match.index} href={safeUrl(match[3])} target="_blank" rel="noreferrer" className="text-[var(--primary)] underline underline-offset-4">
          {match[2] || match[3]}
        </a>
      );
    } else if (match[4]) {
      nodes.push(
        <code key={match.index} className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-sm">
          {match[5]}
        </code>
      );
    } else if (match[6]) {
      nodes.push(<strong key={match.index}>{match[7]}</strong>);
    } else if (match[8]) {
      nodes.push(<em key={match.index}>{match[9]}</em>);
    } else if (match[10]) {
      nodes.push(<del key={match.index}>{match[11]}</del>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function parseBlocks(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let codeLanguage = "";

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  for (const line of lines) {
    const codeFence = line.match(/^```([a-zA-Z0-9_-]+)?\s*$/);
    if (codeFence) {
      if (code) {
        blocks.push({ type: "code", language: codeLanguage, code: code.join("\n") });
        code = null;
        codeLanguage = "";
      } else {
        flushParagraph();
        code = [];
        codeLanguage = codeFence[1] || "text";
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "hr" });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }
    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      flushParagraph();
      blocks.push({ type: "quote", text: quote[1] });
      continue;
    }
    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushParagraph();
      const last = blocks.at(-1);
      if (last?.type === "ul") last.items.push(ul[1]);
      else blocks.push({ type: "ul", items: [ul[1]] });
      continue;
    }
    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushParagraph();
      const last = blocks.at(-1);
      if (last?.type === "ol") last.items.push(ol[1]);
      else blocks.push({ type: "ol", items: [ol[1]] });
      continue;
    }
    paragraph.push(line.trim());
  }
  if (code) blocks.push({ type: "code", language: codeLanguage, code: code.join("\n") });
  flushParagraph();
  return blocks;
}

export function MarkdownPreview({ value, emptyText = "暂无正文内容" }: { value: string; emptyText?: string }) {
  const blocks = parseBlocks(value);
  if (!blocks.length) return <p className="muted">{emptyText}</p>;

  return (
    <div className="prose-content grid gap-4">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const size = block.level === 1 ? "text-3xl" : block.level === 2 ? "text-2xl" : "text-xl";
          return <h2 key={index} className={`${size} font-semibold`}>{parseInline(block.text)}</h2>;
        }
        if (block.type === "quote") {
          return <blockquote key={index} className="border-l-4 border-[var(--primary)] pl-4 muted">{parseInline(block.text)}</blockquote>;
        }
        if (block.type === "ul") {
          return <ul key={index} className="list-disc space-y-2 pl-6">{block.items.map((item, itemIndex) => <li key={itemIndex}>{parseInline(item)}</li>)}</ul>;
        }
        if (block.type === "ol") {
          return <ol key={index} className="list-decimal space-y-2 pl-6">{block.items.map((item, itemIndex) => <li key={itemIndex}>{parseInline(item)}</li>)}</ol>;
        }
        if (block.type === "hr") return <hr key={index} className="border-[var(--border)]" />;
        if (block.type === "code") {
          return (
            <figure key={index} className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
              <figcaption className="border-b border-[var(--border)] px-3 py-2 text-xs uppercase muted">{block.language || "text"}</figcaption>
              <pre className="overflow-auto p-4 text-sm"><code>{block.code}</code></pre>
            </figure>
          );
        }
        return <p key={index}>{parseInline(block.text)}</p>;
      })}
    </div>
  );
}
