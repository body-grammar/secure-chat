import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";
import ChatArea from "../components/chat/ChatArea";
import { useState } from "react";

function AppLayout() {
    const [activeChannel, setActiveChannel] = useState("general");

    return (
        <div className="app-layout">
            <Sidebar activeChannel={activeChannel} onChannelChange={setActiveChannel} />

            <div className="app-content">
                <TopBar activeChannel={activeChannel} />

                <main className="app-main">
                    <ChatArea activeChannel={activeChannel} />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;