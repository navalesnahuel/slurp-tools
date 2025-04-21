<img src="/images/slurptools-banner.png" alt="Slurp Tools" />

### ✨ Key Features

- Free & open-source.
- Undo and Redo
- Image Edition
- Scanning Images
- Images to PDF

### 🚀 Quick Start

Deploy with Docker in seconds:

```bash
docker run -it -p 8000:8000 -p 2222:2222 -p 3000:3000 navalesnahuel/slurp-tools:latest
```

Then navigate to:
```
http://localhost:2222
```

### 🔧 Tech Stack

- **Backend**: Go (Golang) - Fast and efficient server-side processing
- **Frontend**: SvelteKit 
- **Scanner Microservice**: Python (Uvicorn + FastAPI) - Optimized for image processing
- **Containerization**: Docker - Simple deployment across environments
