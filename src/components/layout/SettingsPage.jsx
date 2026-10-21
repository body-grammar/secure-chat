import { UserRound, Palette, ShieldCheck, Bell } from "lucide-react";

function SettingsPage({ currentUser }) {
  return (
    <div className="home-dashboard">
      <header className="home-header">
        <p className="home-eyebrow">NEXUS / PREFERENCES</p>
        <h1>Settings</h1>
        <p>Manage your account and workspace preferences.</p>
      </header>

      <section className="home-cards">
        <article className="home-card">
          <UserRound size={22} />
          <h3>Account</h3>
          <p>Your current NEXUS account details.</p>
          <span>{currentUser?.username || "User"}</span>
        </article>

        <article className="home-card">
          <Palette size={22} />
          <h3>Appearance</h3>
          <p>Customize the look and feel of your workspace.</p>
          <span>Dark theme</span>
        </article>

        <article className="home-card">
          <ShieldCheck size={22} />
          <h3>Security</h3>
          <p>Review your session and encryption settings.</p>
          <span>Review required</span>
        </article>

        <article className="home-card">
          <Bell size={22} />
          <h3>Notifications</h3>
          <p>Notification preferences will be available here.</p>
          <span>Coming soon</span>
        </article>
      </section>
    </div>
  );
}

export default SettingsPage;