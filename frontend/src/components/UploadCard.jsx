import { useState } from "react";
import api from "../services/api";

function UploadCard({ onTranscript }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) {
            alert("Please select an audio file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            setLoading(true);
            const response = await api.post(
                "/transcription/transcribe",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data"
                    }
                }
            );
            onTranscript(response.data.transcript);
        } catch (error) {
            console.log("Full Error:", error);
            console.log("Response:", error.response);
            console.log("Data:", error.response?.data);
            console.log("Status:", error.response?.status);
            alert("Failed to transcribe audio.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>📁 Upload Sales Call</h2>

            <label className="upload-box">
                <input
                    type="file"
                    hidden
                    accept="audio/*"
                    onChange={handleFileChange}
                />
                Click here to select an audio file
            </label>

            {selectedFile && (
                <div className="file-info">
                    <p><strong>File:</strong> {selectedFile.name}</p>
                    <p>
                        <strong>Size:</strong>{" "}
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                </div>
            )}

            <button
                onClick={handleAnalyze}
                disabled={loading}
            >
                {loading ? "Analyzing..." : "Analyze Audio"}
            </button>

        </div>
    );
}

export default UploadCard;