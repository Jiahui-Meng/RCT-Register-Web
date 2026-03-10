import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <div className="card">
        <h1>Hand Hygiene Training Trail - CUHK</h1>
        <p className="muted">
          Location: Pathology Teaching Laboratory 6 , 1/F, Lui Che Woo Clinical Sciences Building, Prince of Wales Hospital
        </p>
        <div className="row">
          <Link href="/register" className="link-button">
            Student Registration
          </Link>
          <Link href="/lookup" className="link-button">
            Check My Booking
          </Link>
        </div>
      </div>
    </main>
  );
}
