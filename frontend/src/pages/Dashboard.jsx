import { useState } from "react";
import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import TranscriptCard from "../components/TranscriptCard";

function Dashboard() {
    const [transcript, setTranscript] = useState("");
    return (
        <>
            <Navbar />
            <div className="container">
                <UploadCard
                    onTranscript={setTranscript}
                />
                <TranscriptCard
                    transcript={transcript}
                />
            </div>
        </>
    );
}

export default Dashboard;