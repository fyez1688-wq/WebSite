"use client";

import { Copy } from "lucide-react";

export function CopyLinkButton() {
  return (
    <button
      className="btn"
      onClick={() => {
        navigator.clipboard.writeText(location.href);
        alert("链接已复制");
      }}
    >
      <Copy className="size-5" />
      复制链接
    </button>
  );
}
