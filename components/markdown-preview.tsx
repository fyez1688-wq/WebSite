"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import lua from "react-syntax-highlighter/dist/esm/languages/prism/lua";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import powershell from "react-syntax-highlighter/dist/esm/languages/prism/powershell";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("c", c);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("csharp", csharp);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("lua", lua);
SyntaxHighlighter.registerLanguage("powershell", powershell);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);

const languageAliases: Record<string, string> = {
  bash: "bash",
  csharp: "csharp",
  cs: "csharp",
  html: "html",
  javascript: "javascript",
  js: "javascript",
  jsx: "jsx",
  plaintext: "text",
  powershell: "powershell",
  ps1: "powershell",
  py: "python",
  python: "python",
  sh: "bash",
  shell: "bash",
  "structured-text": "text",
  text: "text",
  ts: "typescript",
  tsx: "tsx",
  typescript: "typescript"
};

const supportedLanguages = new Set([
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "html",
  "java",
  "javascript",
  "json",
  "jsx",
  "lua",
  "powershell",
  "python",
  "sql",
  "tsx",
  "typescript"
]);

function normalizeLanguage(value?: string) {
  const raw = (value || "text").toLowerCase().replace(/^language-/, "");
  const normalized = languageAliases[raw] || raw;
  return supportedLanguages.has(normalized) ? normalized : "text";
}

function safeLinkUrl(value: unknown) {
  if (typeof value !== "string") return "#";
  if (value.startsWith("/") || value.startsWith("#")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : "#";
  } catch {
    return "#";
  }
}

function safeImageUrl(value: unknown) {
  if (typeof value !== "string") return "";
  if (value.startsWith("/")) return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? value : "";
  } catch {
    return "";
  }
}

function flattenText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join("");
  return "";
}

function makeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function headingId(children: ReactNode, node: unknown) {
  const line =
    typeof node === "object" &&
    node !== null &&
    "position" in node &&
    typeof node.position === "object" &&
    node.position !== null &&
    "start" in node.position &&
    typeof node.position.start === "object" &&
    node.position.start !== null &&
    "line" in node.position.start
      ? String(node.position.start.line)
      : "0";
  return `${makeSlug(flattenText(children))}-${line}`;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const normalized = normalizeLanguage(language);
  const languageLabel = normalized === "text" ? "plaintext" : normalized;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2200);
  }

  return (
    <figure className="not-prose overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <figcaption className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide muted">{languageLabel}</span>
        <button type="button" className="btn min-h-8 px-2 py-1 text-xs" onClick={copyCode}>
          {state === "copied" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制代码"}
        </button>
      </figcaption>
      <div className="max-w-full overflow-x-auto">
        {normalized === "text" ? (
          <pre className="m-0 min-w-0 p-4 text-sm leading-6">
            <code>{code}</code>
          </pre>
        ) : (
          <SyntaxHighlighter
            language={normalized}
            style={oneLight}
            customStyle={{ margin: 0, minWidth: "100%", background: "transparent", padding: "1rem" }}
            codeTagProps={{ style: { fontFamily: "inherit" } }}
            PreTag="pre"
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </figure>
  );
}

export function MarkdownPreview({
  value,
  emptyText = "暂无正文内容",
  className = ""
}: {
  value: string;
  emptyText?: string;
  className?: string;
}) {
  if (!value.trim()) return <p className="muted">{emptyText}</p>;

  return (
    <div className={`markdown-body prose-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a({ href, children, ...props }) {
            const safeHref = safeLinkUrl(href);
            const external = safeHref.startsWith("http://") || safeHref.startsWith("https://");
            return (
              <a {...props} href={safeHref} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            const safeSrc = safeImageUrl(src);
            if (!safeSrc) return null;
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={safeSrc} alt={alt || ""} loading="lazy" />;
          },
          h1({ children, node }) {
            return <h1 id={headingId(children, node)}>{children}</h1>;
          },
          h2({ children, node }) {
            return <h2 id={headingId(children, node)}>{children}</h2>;
          },
          h3({ children, node }) {
            return <h3 id={headingId(children, node)}>{children}</h3>;
          },
          h4({ children, node }) {
            return <h4 id={headingId(children, node)}>{children}</h4>;
          },
          h5({ children, node }) {
            return <h5 id={headingId(children, node)}>{children}</h5>;
          },
          h6({ children, node }) {
            return <h6 id={headingId(children, node)}>{children}</h6>;
          },
          table({ children }) {
            return (
              <div className="markdown-table-wrap">
                <table>{children}</table>
              </div>
            );
          },
          code({ className, children, ...props }: ComponentProps<"code"> & { inline?: boolean }) {
            const rawCode = String(children);
            const code = rawCode.replace(/\n$/, "");
            const language = /language-([a-zA-Z0-9_-]+)/.exec(className || "")?.[1] || "text";
            if (!rawCode.includes("\n") && !className) {
              return (
                <code {...props} className="markdown-inline-code">
                  {children}
                </code>
              );
            }
            return <CodeBlock language={language} code={code} />;
          }
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
