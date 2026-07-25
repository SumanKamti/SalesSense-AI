import { useState } from "react";

function UploadCard() {
    const [fileName, setFileName] = useState("No file selected");
    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            setFileName(event.target.files[0].name);
        }
    };
    return (
        <div className="card">
            <h2>Upload Sales Call</h2>
            <input
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
            />
            <p>{fileName}</p>
            <button>Analyze Audio</button>
        </div>
    );
}

export default UploadCard;