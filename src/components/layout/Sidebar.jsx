import {
    Hash,
    Shield,
    Smartphone,
    Command,
    Settings,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAllUsers } from "../../api/user";

function Sidebar({ activeChannel, onChannelChange, activeDM, onDMChange, currentUser, onLogout }) {
    const channels = [
        "general",
        "engineering",
        "security",
        "random",
    ];
    
    const [directMessages, setDirectMessages] = useState([]);
    const [usersError, setUsersError] = useState("");

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const users = await getAllUsers(token);
                setDirectMessages(users);
                setUsersError("");
            } catch (error) {
                console.error("Failed to load users:", error);
                setUsersError("Could not load users");
            }
        };

        loadUsers();
    }, []);

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

                {usersError && <p>{usersError}</p>}

                {directMessages.map((user) => (
                    <div
                        className={`sidebar-item ${
                            activeDM === user.username ? "active" : ""
                        }`}
                        key={user._id}
                        onClick={() => onDMChange(user.username)}
                    >
                        <span>●</span>
                        <span>{user.username}</span>
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
                <div className="username">
                    {currentUser?.username || "Loading..."}
                </div>
                <span>Online</span>
                <button onClick={onLogout}>Logout</button>
            </div>
        </aside>
    );
}

export default Sidebar;