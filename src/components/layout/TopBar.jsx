function TopBar({ activeChannel, currentUser }) {
    return (
        <header className="top-bar">
            <div>
                <h2># {activeChannel}</h2>
                <span>{currentUser?.username || "Loading..."}</span>
            </div>

            <div className="connection-status">
                <span>●</span>
                <span>SECURE</span>
            </div>
        </header>
    );
}

export default TopBar;