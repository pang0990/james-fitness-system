import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <span className="eyebrow">JAMES FITNESS SYSTEM</span>
      <h1>找不到這個頁面</h1>
      <p>這個連結可能已經變更。</p>
      <Link className="button" href="/today">
        回到 Today
      </Link>
    </main>
  );
}
