# Cloud-Sentinel — AI Log Interpreter

> **An intelligent DevOps log analysis platform** that transforms raw, high-volume system logs into actionable human-readable summaries using a 3-phase AI pipeline.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧱 **Phase A — Drain3 Parsing** | Mines log templates from raw lines using the Drain algorithm |
| 📊 **Phase B — TF-IDF Ranking** | Scores templates by anomaly importance, surfaces top signals |
| 🤖 **Phase C — T5 Summarization** | Generates a plain-English incident summary using a T5 transformer |
| 📡 **Live Stream** | Real-time log tailing via Server-Sent Events |
| 🗃️ **Dataset Replay** | Replay up to 2,000 lines from the bundled BGL supercomputer dataset |
| ⚡ **9 Demo Scenarios** | Pre-built incidents — from SSH brute force to kernel panics |
| 📈 **Recharts Visualisation** | Cluster importance bar chart in the results panel |

---

## 🛠️ Tech Stack

- **Backend** — FastAPI (Python 3.10+), Uvicorn
- **AI/ML** — HuggingFace Transformers (T5), Scikit-Learn (TF-IDF), Drain3
- **Frontend** — React 19 + Vite, Recharts, Axios
- **Deployment** — Nginx Reverse Proxy, Conda, EC2

---

## 📦 Quick Start

### 1. Clone & configure
```bash
git clone https://github.com/your-username/cloud-sentinel.git
cd cloud-sentinel
cp .env.example .env   # edit as needed
```

### 2. Backend

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn api.server:app --reload
```

API will be available at **http://127.0.0.1:8000**  
Swagger docs at **http://127.0.0.1:8000/docs**

### 3. Frontend

```bash
cd sentinel-ui
npm install
npm run dev
```

UI will be available at **http://localhost:5173**

---

## ⚙️ Configuration (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Backend port |
| `USE_AI` | `True` | Enable/disable T5 transformer |
| `MODEL_NAME` | `t5-small` | HuggingFace model name (e.g. `t5-base`) |
| `DATA_DIR` | `data` | Directory for state files and logs |
| `CORS_ORIGINS` | *(empty = allow all)* | Comma-separated allowed origins for production |
| `VITE_API_URL` | `http://127.0.0.1:8000` | Backend URL for the frontend |

---

## 🚀 Deployment

Cloud-Sentinel is designed to be lightweight and can be deployed without heavy containerization engines like Docker. 

### Standard Production Setup (Nginx + Uvicorn)
For a standard deployment on a VPS or cloud instance:
1. **Frontend:** Build the React application (`cd sentinel-ui && npm run build`) and serve the `dist` folder using Nginx as a static file server.
2. **Backend:** Run the FastAPI application using `uvicorn` and configure Nginx as a reverse proxy to route `/api/*` requests to the Uvicorn port.

### Special Case: Low-Resource Environments (e.g., 2GB RAM EC2)
If you are deploying to a resource-constrained server where running Node.js build scripts or heavy installations might trigger Out-Of-Memory (OOM) kills, use this manual deployment strategy:

**1. Transfer the Frontend:**
Build the frontend on your local development machine, then securely copy the compiled `dist` directory to your server.
```bash
# On your local machine
cd sentinel-ui && npm run build
scp -r dist/ user@your-server-ip:~/Cloud-Sentinel/sentinel-ui/dist
```

**2. Setup a Conda Environment (Server):**
SSH into your server and use Conda to manage an isolated Python environment. To save disk space and RAM, install the **CPU-only** version of PyTorch.
```bash
conda create -n sentinel python=3.10 -y
conda activate sentinel

# Install CPU-ONLY PyTorch to prevent massive CUDA binaries from downloading
pip install torch==2.3.1+cpu --extra-index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

**3. Run the Backend:**
Run the application using Uvicorn. You can then point your Nginx reverse proxy to this local port.
```bash
uvicorn api.server:app --host 127.0.0.1 --port 8000
```

---

## 📁 Project Structure

```
cloud-sentinel/
├── api/
│   └── server.py          # FastAPI backend — all endpoints
├── engine/
│   ├── parser.py           # Phase A: Drain3 log template miner
│   ├── analyzer.py         # Phase B: TF-IDF anomaly ranker
│   └── summarizer.py       # Phase C: T5 transformer summarizer
├── datasets/
│   ├── bgl_sample.log         # BGL supercomputer log dataset
│   └── replay_loader.py       # Dataset replay utility
├── sentinel-ui/               # React + Vite frontend
│   └── src/
│       ├── App.jsx
│       └── index.css
├── tests/
│   ├── test_parser.py
│   └── test_analyzer.py
├── data/                      # Runtime state files (gitignored)
├── .env                       # Environment configuration
└── requirements.txt
```

---

## 🧪 Tests

```bash
python -m pytest tests/ -v
```

---

## 📄 License

MIT — feel free to fork, adapt, and build on it.
