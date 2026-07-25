import Navbar from "../components/Navbar";
import UploadCard from "../components/UploadCard";
import TranscriptCard from "../components/TranscriptCard";

function Dashboard() {
    return (
        <>
            <Navbar />
            <div className="container">
                <UploadCard />
                <TranscriptCard />
            </div>
        </>
    );
}

export default Dashboard;