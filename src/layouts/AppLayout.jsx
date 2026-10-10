
import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import ChatArea from "../components/chat/ChatArea";
import { ShieldCheck, Laptop, Activity } from "lucide-react";

function AppLayout({ currentUser, onLogout, encryptionKeyPair }) {
    const [activeChannel, setActiveChannel] = useState("general");
    const [activeDM, setActiveDM] = useState(null);

    return (
        <div className="app-layout">
            <Sidebar
                activeChannel={activeChannel}
                onChannelChange={(channel) => {
                    setActiveChannel(channel);
                    setActiveDM(null);
                }}
                currentUser={currentUser}
                onLogout={onLogout}
                activeDM={activeDM}
                onDMChange={(user) => {
                    setActiveDM(user);
                    setActiveChannel(null);
                }}
            />

            <div className="app-workspace">
                <div className="workspace-top">
                    <TopBar
                        activeChannel={activeChannel}
                        currentUser={currentUser}
                    />
                </div>

                <div className="workspace-main">
                    <main className="chat-column">
                        <ChatArea
                            activeChannel={activeChannel}
                            activeDM={activeDM}
                            encryptionKeyPair={encryptionKeyPair}
                        />

                        <div className="encryption-bar">
                            <ShieldCheck size={14} />
                            <span>E2E ENCRYPTION:</span>
                            <strong>NOT CONFIGURED</strong>
                            <span className="status-divider">|</span>
                            <span>IDENTITY:</span>
                            <strong>UNVERIFIED</strong>
                        </div>
                    </main>

                    <aside className="security-panel">
                        <div className="panel-tabs">
                            <span>Info</span>
                            <span className="selected">Security</span>
                        </div>

                        <section className="security-card">
                            <ShieldCheck size={30} />
                            <div>
                                <h3>SECURITY STATUS</h3>
                                <p>Encryption is not configured</p>
                            </div>
                        </section>

                        <section className="security-card details-card">
                            <h4>SESSION DETAILS</h4>
                            <div className="detail-row">
                                <span>Authentication</span>
                                <strong>JWT</strong>
                            </div>
                            <div className="detail-row">
                                <span>Transport</span>
                                <strong>Local development</strong>
                            </div>
                            <div className="detail-row">
                                <span>Identity</span>
                                <strong>Unverified</strong>
                            </div>
                            <p className="security-note">
                                End-to-end encryption and identity
                                verification are not yet implemented.
                            </p>
                        </section>
                    </aside>
                </div>

                <section className="security-dashboard">
                    <div className="terminal-panel">
                        <div className="terminal-heading">
                            ~/secure-chat &gt;
                        </div>
                        <p>/secure status</p>
                        <p>/secure devices</p>
                        <p>/secure sessions</p>
                        <p>/secure verify @user</p>
                    </div>

                    <div className="dashboard-panel">
                        <h3>
                            <Activity size={15} />
                            SECURITY OVERVIEW
                        </h3>
                        <div className="dashboard-stat">
                            <span>Authentication</span>
                            <strong>JWT enabled</strong>
                        </div>
                        <div className="dashboard-stat">
                            <span>E2E encryption</span>
                            <strong>Not configured</strong>
                        </div>
                        <div className="dashboard-stat">
                            <span>Identity verification</span>
                            <strong>Not configured</strong>
                        </div>
                    </div>

                    <div className="dashboard-panel device-panel">
                        <h3>
                            <Laptop size={15} />
                            ACTIVE DEVICES
                        </h3>
                        <p>
                            {currentUser?.username || "Loading user"}
                        </p>
                        <span>Current session</span>
                        <p className="device-note">
                            Device trust tracking is not implemented yet.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default AppLayout;