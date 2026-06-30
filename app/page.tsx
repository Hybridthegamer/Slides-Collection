import Link from "next/link";
import UploadForm from "@/components/UploadForm";

export default function Home() {
  return (
    <main className="page">
      <div className="container">
        <h1>Submit Your Slides</h1>
        <p className="subtitle">
          Upload your presentation slides here instead of bringing a flash drive.
          Your supervisor will download them directly when it&apos;s your turn.
        </p>
        <UploadForm />
        <p className="footer-link">
          <Link href="/supervisor">Supervisor view →</Link>
        </p>
      </div>
    </main>
  );
}
