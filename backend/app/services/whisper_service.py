from faster_whisper import WhisperModel

# Load model once when the server starts
model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

def transcribe_audio(file_path: str):
    segments, info = model.transcribe(file_path)
    transcript = ""
    for segment in segments:
        transcript += segment.text + " "
    return transcript.strip()