import {
    Hash,
    Shield,
    Smartphone,
    Command,
    Settings,
} from "lucide-react";

function Sidebar({ activeChannel, onChannelChange }) {
    const channels = [
        "general", 
        "engineering",
        "security",
        "random",
    ];

    const directMessages = [
        "Alice",
        "Bob", 
        "Charlie",
    ];

    return (
        <aside className="sidebar">
            <h2>NEXUS</h2>
            <p>SECURE CHAT</p>

            <div className="workspace">
                <h3>WORKSPACE</h3>
                
                {channels.map((channel) => (
                    <div className={`sidebar-item ${activeChannel === channel ? "active" : ""}`} key={channel} onClick={() => onChannelChange(channel)}>
                        <Hash size={16} />
                        <span>{channel}</span>
                    </div>
                ))}
            </div>

            <div className="direct-messages">
                <h3>DIRECT MESSAGES</h3>

                {directMessages.map((user) => (
                    <div className="sidebar-item" key={user}>
                        <span>●</span>
                        <span>{user}</span>
                    </div>
                ))}
            </div>

            <div className="system">
                <h3>SYSTEM</h3>

                <div className="sidebar-item">
                    <Shield size={16} />
                    <span>Security Center</span>
                </div>

                <div className="sidebar-item">
                    <Smartphone size={16} />
                    <span>Device Manager</span>
                </div>

                <div className="sidebar-item">
                    <Command size={16} />
                    <span>Command Palette</span>
                </div>

                <div className="sidebar-item">
                    <Settings size={16} />
                    <span>Settings</span>
                </div>
            </div>

            <div className="user-profile">
                <div>● user@arch</div>
                <span>Online</span>
            </div>
        </aside>
    );
}

export default Sidebar;