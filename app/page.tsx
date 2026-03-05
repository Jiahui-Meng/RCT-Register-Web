import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <div className="card">
        <h1>RCT Registration System</h1>
        <p className="muted">
          Students can submit 3 ranked session preferences. The system assigns the first available
          option automatically.
        </p>
        <div className="row">
          <Link href="/register" className="link-button">
            Student Registration
          </Link>
        </div>
      </div>
    </main>
  );
}
