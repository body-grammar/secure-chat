import { ShieldCheck, MessageSquare, Smartphone, Activity } from "lucide-react";

function Home({ currentUser }) {
  return (
    <div className="home-dashboard">
      <header className="home-header">
        <p className="home-eyebrow">NEXUS / SECURE WORKSPACE</p>
        <h1>
          Welcome back, {currentUser?.username || "User"}
        </h1>
        <p>Your private communication workspace.</p>
      </header>

      <section className="home-cards">
        <article className="home-card">
          <MessageSquare size={22} />
          <h3>Messages</h3>
          <p>Open your channels and conversations.</p>
          <span>Messaging workspace</span>
        </article>

        <article className="home-card">
          <ShieldCheck size={22} />
          <h3>Security status</h3>
          <p>Review your current session security.</p>
          <span>Encryption not configured</span>
        </article>

        <article className="home-card">
          <Smartphone size={22} />
          <h3>Devices</h3>
          <p>Device management will be available here.</p>
          <span>Coming soon</span>
        </article>
      </section>

      <section className="home-activity">
        <h2><Activity size={18} /> Workspace overview</h2>
        <p>
          Your NEXUS workspace is ready. Select Messages in the sidebar
          to start a conversation.
        </p>
      </section>
    </div>
  );
}

export default Home;