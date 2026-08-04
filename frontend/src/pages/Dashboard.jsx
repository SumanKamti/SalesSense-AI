import { useState } from "react";
import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import TranscriptCard from "../components/TranscriptCard";

function Dashboard() {
    const [conversation, setConversation] = useState([]);

    return (
        <>
            <Navbar />
            <div className="container">
                <UploadCard onResult={setConversation} />
                <TranscriptCard conversation={conversation} />
            </div>
        </>
    );
}

export default Dashboard;