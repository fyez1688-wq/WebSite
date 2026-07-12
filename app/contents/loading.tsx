export default function ContentsLoading() {
  return (
    <main className="container page-shell" aria-label="内容加载中">
      <div className="skeleton h-32 rounded-lg" />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="skeleton h-72 rounded-lg" />)}
      </div>
    </main>
  );
}
