function TranscriptCard({ transcript }) {
    return (
        <div className="card">
            <h2>Transcript</h2>
            <p>
                {transcript || "Transcript will appear here..."}
            </p>
        </div>
    );
}

export default TranscriptCard;