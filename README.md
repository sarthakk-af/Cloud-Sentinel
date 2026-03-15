# Cloud-Sentinel: DevOps AI Log Interpreter

Cloud-Sentinel is an intelligent log analysis platform that transforms raw, high-volume system logs into actionable human-readable summaries using a 3-phase AI pipeline.

## 🚀 Features
- **Structural Brain**: Fast log template mining using Drain3.
- **Analytical Brain**: TF-IDF based anomaly ranking.
- **Human Brain**: Natural language summarization using T5 Transformers.
- **Live Stream**: Real-time log monitoring via SSE.

## 🛠️ Tech Stack
- **Backend**: FastAPI (Python 3.10+)
- **Frontend**: React (Vite, Axios)
- **AI/ML**: Scikit-Learn, Transformers (T5-small), Drain3

## 📦 Setup & Installation

### Backend
1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the server:
   ```bash
   uvicorn api.server:app --reload
   ```

### Frontend
1. Navigate to UI directory:
   ```bash
   cd sentinel-ui
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

## 🏗️ Docker
Build and run with Docker:
```bash
docker build -t cloud-sentinel .
docker run -p 8000:8000 cloud-sentinel
```

## 📄 License
MIT
