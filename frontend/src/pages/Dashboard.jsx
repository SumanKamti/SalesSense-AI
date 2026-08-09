import { useState } from "react";
import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import TranscriptCard from "../components/TranscriptCard";
import AnalysisCard from "../components/AnalysisCard";

function Dashboard() {
    const [conversation, setConversation] = useState([]);

    return (
        <>
            <Navbar />
            <div className="container">
                <UploadCard onResult={setConversation} />
                <TranscriptCard conversation={conversation} />
                <AnalysisCard conversation={conversation} />
            </div>
        </>
    );
}

export default Dashboard;