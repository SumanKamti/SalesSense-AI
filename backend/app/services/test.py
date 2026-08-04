import librosa
import torch
from app.services.diarization_service import diarize_audio

# Load audio file with librosa
audio_path = "app/uploads/harvard.wav"
waveform, sample_rate = librosa.load(audio_path, sr=None)

# Convert to torch tensor and reshape to (1, time) for mono audio
waveform_tensor = torch.tensor(waveform, dtype=torch.float32).unsqueeze(0)

# Prepare audio in the format pyannote expects
audio_dict = {
    'waveform': waveform_tensor,
    'sample_rate': sample_rate
}

print(f"Audio loaded: {audio_path}")
print(f"Sample rate: {sample_rate}Hz")
print(f"Waveform shape: {waveform_tensor.shape}")
print("\nRunning diarization...\n")

result = diarize_audio(audio_dict)

print("Diarization results:")
for segment in result:
    print(segment)