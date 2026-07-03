"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container py-16">
      <div className="card p-10 text-center">
        <p>页面加载失败。</p>
        <button className="btn mt-4" onClick={reset}>重新加载</button>
      </div>
    </main>
  );
}
