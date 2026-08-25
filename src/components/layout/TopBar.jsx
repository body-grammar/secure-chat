function TopBar({ activeChannel }) {
    return (
        <header className="top-bar">
            <div>
                <h2># {activeChannel}</h2>
                <span>12 members</span>
            </div>

            <div className="connection-status">
                <span>●</span>
                <span>SECURE</span>
            </div>
        </header>
    );
}

export default TopBar;