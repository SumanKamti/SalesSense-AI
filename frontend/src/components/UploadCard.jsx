import { useState, useEffect } from "react";
import api from "../services/api";

function UploadCard({ onResult }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        let timer;
        if (loading) {
            timer = setInterval(() => {
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(timer);
    }, [loading]);

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        setError(null);
        if (!selectedFile) {
            setError("Please select an audio file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            setLoading(true);
            setElapsedTime(0);
            const response = await api.post(
                "/conversation/analyze",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            onResult(response.data.conversation);
        } catch (error) {
            console.log("Full Error:", error);
            console.log("Response:", error.response);
            console.log("Data:", error.response?.data);
            console.log("Status:", error.response?.status);
            setError(error.response?.data?.detail || "Failed to analyze audio. Please try again.");
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
                    <p>
                        <strong>File:</strong> {selectedFile.name}
                    </p>
                    <p>
                        <strong>Size:</strong>{" "}
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                </div>
            )}

            <button onClick={handleAnalyze} disabled={loading} className={loading ? "loading-btn" : ""}>
                {loading && <span className="spinner"></span>}
                {loading ? `Analyzing... (${elapsedTime}s elapsed)` : "Analyze Audio"}
            </button>
            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)} className="error-close">✕</button>
                </div>
            )}
        </div>
    );
}

export default UploadCard;