import {
  Hash,
  Shield,
  Smartphone,
  Command,
  Settings,
  Home,
  MessageSquare,
  FileText,
  Plus,
  ChevronDown,
  LogOut,
  LockKeyhole,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAllUsers } from "../../api/user";
import NexusLogo from "../NexusLogo";
import { PanelLeftClose } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function Sidebar({
  channels = [],
  activeChannel,
  onChannelChange,
  activeDM,
  onDMChange,
  currentUser,
  onLogout,
  onChannelsRefresh,
  activePage,
  onPageChange,
}) {

  const [directMessages, setDirectMessages] = useState([]);
  const [usersError, setUsersError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [joiningChannelId, setJoiningChannelId] = useState(null);
  const [channelError, setChannelError] = useState("");
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");

  const handleJoinChannel = async (channel) => {
    const token = localStorage.getItem("token");
    if (!token || joiningChannelId) return;

    setJoiningChannelId(channel._id);
    setChannelError("");

    try {
      const response = await fetch(
        `${API_URL}/channels/${channel._id}/join`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join channel");
      }

      const refreshedChannels = await onChannelsRefresh?.();

      const joinedChannel = refreshedChannels?.find(
        (item) => item._id === channel._id
      );

      if (joinedChannel) {
        onChannelChange(joinedChannel);
      }
    } catch (error) {
      console.error("Join channel error:", error);
      setChannelError(error.message || "Failed to join channel");
    } finally {
      setJoiningChannelId(null);
    }
  };

  const handleCreateChannel = async () => {
    const token = localStorage.getItem("token");
    const name = newChannelName.trim();

    if (!token || !name) return;

    setChannelError("");

    try {
      const response = await fetch(
        `${API_URL}/channels`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            description: newChannelDescription.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create channel");
      }

      setCreateChannelOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");

      const refreshedChannels = await onChannelsRefresh?.();

      const createdChannel = refreshedChannels?.find(
        (channel) => channel._id === data.channel._id
      );

      onChannelChange(
        createdChannel || { ...data.channel, isMember: true }
      );
    } catch (error) {
      console.error("Create channel error:", error);
      setChannelError(error.message || "Failed to create channel");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const users = await getAllUsers(token);

        if (!cancelled) {
          setDirectMessages(
            users.filter((user) => user._id !== currentUser?._id)
          );
          setUsersError("");
        }
      } catch (error) {
        console.error("Failed to load users:", error);
        if (!cancelled) setUsersError("Could not load users");
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [currentUser?._id]);

  return (
    <aside
      className={`sidebar nexus-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      <div className="nexus-sidebar-brand">
        <NexusLogo compact />

        <div className="sidebar-brand-copy">
          <span>NEXUS</span>
          <small>SECURE CHAT</small>
        </div>

        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={() => setCollapsed((previous) => !previous)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftClose size={17} />
        </button>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-section-title">WORKSPACE</h3>

        <button
          type="button"
          className={`sidebar-item sidebar-nav-button ${
            activePage === "home" ? "active" : ""
          }`}
          onClick={() => onPageChange("home")}
        >
          <Home size={17} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`sidebar-item sidebar-nav-button ${
            activePage === "messages" ? "active" : ""
          }`}
          onClick={() => onPageChange("messages")}
        >
          <MessageSquare size={17} />
          <span>Messages</span>
        </button>

        <button
          type="button"
          className={`sidebar-item sidebar-nav-button ${
            activePage === "files" ? "active" : ""
          }`}
          onClick={() => onPageChange("files")}
        >
          <FileText size={17} />
          <span>Files</span>
        </button>

        <button
          type="button"
          className={`sidebar-item sidebar-nav-button ${
            activePage === "settings" ? "active" : ""
          }`}
          onClick={() => onPageChange("settings")}
        >
          <Settings size={17} />
          <span>Settings</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-heading">
          <h3 className="sidebar-section-title">CHANNELS</h3>
          <button
            type="button"
            className="sidebar-icon-button"
            aria-label="Add channel"
            title="Create a channel"
            onClick={() => {
              setNewChannelName("");
              setNewChannelDescription("");
              setChannelError("");
              setCreateChannelOpen(true);
            }}
          >
            <Plus size={17} />
          </button>
        </div>

        {channels.map((channel) => (
          <div className="sidebar-channel-row" key={channel._id}>
            <button
              type="button"
              className={`sidebar-item sidebar-nav-button ${
                activeChannel === channel._id && !activeDM ? "active" : ""
              }`}
              onClick={() => {
                if (channel.isMember) {
                  onChannelChange(channel);
                }
              }}
              disabled={!channel.isMember}
              title={
                channel.isMember
                  ? channel.description || channel.name
                  : "Join this channel to access it"
              }
            >
              <Hash size={18} />
              <span>{channel.name}</span>

              {activeChannel === channel._id && !activeDM && (
                <span className="sidebar-active-dot" />
              )}
            </button>

            {!channel.isMember && (
              <button
                type="button"
                className="sidebar-channel-join"
                disabled={joiningChannelId !== null}
                onClick={() => handleJoinChannel(channel)}
              >
                {joiningChannelId === channel._id ? "Joining..." : "Join"}
              </button>
            )}
          </div>
        ))}

        {channelError && (
          <p className="sidebar-error" role="alert">
            {channelError}
          </p>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-heading">
          <h3 className="sidebar-section-title">DIRECT MESSAGES</h3>
          <span className="sidebar-live-indicator" title="Direct messages" />
        </div>

        {usersError && (
          <p className="sidebar-error" role="status">
            {usersError}
          </p>
        )}

        {directMessages.map((user) => (
          <button
            type="button"
            className={`sidebar-item sidebar-nav-button ${
              activeDM === user.username ? "active" : ""
            }`}
            key={user._id}
            onClick={() => onDMChange(user.username)}
          >
            <span className="sidebar-avatar">
              {user.username?.charAt(0).toUpperCase() || "?"}
            </span>
            <span className="sidebar-user-name">{user.username}</span>
            <span className="sidebar-presence-dot" />
          </button>
        ))}

        {!usersError && directMessages.length === 0 && (
          <p className="sidebar-empty">No other users yet</p>
        )}
      </div>

      <div className="sidebar-section sidebar-system-section">
        <h3 className="sidebar-section-title">SYSTEM</h3>

        <button type="button" className="sidebar-item sidebar-nav-button">
          <Shield size={17} />
          <span>Security Center</span>
        </button>

        <button type="button" className="sidebar-item sidebar-nav-button">
          <Smartphone size={17} />
          <span>Device Manager</span>
        </button>

        <button type="button" className="sidebar-item sidebar-nav-button">
          <Command size={17} />
          <span>Command Palette</span>
        </button>

        <button type="button" className="sidebar-item sidebar-nav-button">
          <Settings size={17} />
          <span>Settings</span>
        </button>
      </div>

      <div className="sidebar-terminal-card">
        <div className="terminal-card-accent" />
        <p className="terminal-card-title">NEXUS v1.0.0</p>
        <p><span>›</span> Encrypted messaging</p>
        <p><span>›</span> Privacy by design</p>
        <p><span>›</span> Your privacy matters</p>
        <div className="terminal-card-prompt">› _</div>
      </div>

      <div className="user-profile">
        <div className="sidebar-avatar profile-avatar">
          {currentUser?.username?.charAt(0).toUpperCase() || "U"}
        </div>

        <div className="profile-user-details">
          <span className="username">
            {currentUser?.username || "Loading..."}
          </span>
          <span className="profile-status">
            <span className="sidebar-presence-dot" />
            Online
          </span>
        </div>

        <button
          type="button"
          className="profile-menu-button"
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
          aria-label="Toggle account menu"
        >
          <ChevronDown size={17} />
        </button>

        {profileOpen && (
          <div className="profile-menu">
            <div className="profile-menu-heading">
              <LockKeyhole size={14} />
              Account
            </div>
            <button
              type="button"
              className="profile-logout-button"
              onClick={onLogout}
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        )}

        {createChannelOpen && (
          <div className="channel-modal-overlay">
            <div
              className="channel-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-channel-title"
            >
              <div className="channel-modal-header">
                <h2 id="create-channel-title">Create a channel</h2>
                <button
                  type="button"
                  onClick={() => setCreateChannelOpen(false)}
                  aria-label="Close dialog"
                >
                  ×
                </button>
              </div>

              <label htmlFor="new-channel-name">Channel name</label>
              <input
                id="new-channel-name"
                type="text"
                value={newChannelName}
                onChange={(event) => setNewChannelName(event.target.value)}
                placeholder="e.g. project-alpha"
                minLength={2}
                maxLength={40}
              />

              <label htmlFor="new-channel-description">
                Description (optional)
              </label>
              <textarea
                id="new-channel-description"
                value={newChannelDescription}
                onChange={(event) =>
                  setNewChannelDescription(event.target.value)
                }
                placeholder="What is this channel for?"
                maxLength={200}
                rows={3}
              />

              {channelError && (
                <p className="sidebar-error" role="alert">
                  {channelError}
                </p>
              )}

              <div className="channel-modal-actions">
                <button
                  type="button"
                  onClick={() => setCreateChannelOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                >
                  Create channel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}

export default Sidebar;