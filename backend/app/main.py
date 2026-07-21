from fastapi import FastAPI

app = FastAPI(
    title="SalesSense AI API",
    description="Backend API for SalesSense AI",
    version="1.0.0"
)

@app.get("/")
def home():
    return{
        "message": "Welcome to SalesSense AI!"
    }

@app.get("/health")
def health():
    return{
        "status": "healthy",
        "message": "Backend is running successfully"
    }