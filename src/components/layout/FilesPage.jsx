import { FileText, Upload, ShieldCheck } from "lucide-react";

function FilesPage() {
  return (
    <div className="home-dashboard">
      <header className="home-header">
        <p className="home-eyebrow">NEXUS / SHARED WORKSPACE</p>
        <h1>Shared Files</h1>
        <p>Attachments shared across your channels and conversations.</p>
      </header>

      <section className="home-cards">
        <article className="home-card">
          <FileText size={22} />
          <h3>All files</h3>
          <p>Find shared documents and attachments in one place.</p>
          <span>No files yet</span>
        </article>

        <article className="home-card">
          <Upload size={22} />
          <h3>File sharing</h3>
          <p>File uploads will be available here in a future step.</p>
          <span>Coming soon</span>
        </article>

        <article className="home-card">
          <ShieldCheck size={22} />
          <h3>Private access</h3>
          <p>Files should only be accessible to authorized conversation members.</p>
          <span>Privacy focused</span>
        </article>
      </section>
    </div>
  );
}

export default FilesPage;