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
- **Deployment** — Docker, GitHub Actions → EC2

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

### 4. (Optional) Live log generator

Open a separate terminal and run:
```bash
python scripts/advanced_generator.py
```

This continuously writes realistic multi-service logs (Nginx, Postgres, Auth, App) to `data/live_system.log` for the Live Stream tab.

---

## ⚙️ Configuration (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Backend port |
| `USE_AI` | `True` | Enable/disable T5 transformer |
| `MODEL_NAME` | `t5-small` | HuggingFace model name (e.g. `t5-base`) |
| `DATA_DIR` | `data` | Directory for state files and logs |
| `LOG_MAX_BYTES` | `5242880` | Max size of live_system.log before auto-rotation (5 MB) |
| `CORS_ORIGINS` | *(empty = allow all)* | Comma-separated allowed origins for production |
| `VITE_API_URL` | `http://127.0.0.1:8000` | Backend URL for the frontend |

---

## 🐳 Docker

```bash
# Build & run
docker build -t cloud-sentinel .
docker run -d -p 8000:8000 --env-file .env cloud-sentinel
```

---

## 🚀 Deploy to EC2

The included **GitHub Actions** workflow (`.github/workflows/deploy.yml`) automatically deploys to an EC2 instance on every push to `master`.

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | Public IP or hostname of the EC2 instance |
| `EC2_USER` | SSH user (e.g. `ubuntu` or `ec2-user`) |
| `EC2_KEY` | Private SSH key for authentication |

The deploy script SSHs into the instance, pulls the latest code, rebuilds the Docker image, and restarts the container.

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
├── scripts/
│   ├── advanced_generator.py  # Multi-service realistic log generator
│   └── log_generator.py       # Simple syslog-format generator
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
├── requirements.txt
└── Dockerfile
```

---

## 🧪 Tests

```bash
python -m pytest tests/ -v
```

---

## 📄 License

MIT — feel free to fork, adapt, and build on it.
