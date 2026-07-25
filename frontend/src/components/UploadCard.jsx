import { useState } from "react";

function UploadCard() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleAnalyze = () => {
        if (!selectedFile) {
            alert("Please select an audio file.");
            return;
        }
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
        }, 3000);
    };

    return (
        <div className="card">
            <h2>📁 Upload Sales Call</h2>
            <label className="upload-box">
            <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    hidden
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