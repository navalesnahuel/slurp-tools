# Slurp Tools

<img src="/images/slurptools-banner.png" alt="Slurp Tools" />

## ✨ Key Features

- **100% Free & Open-Source**: Use and modify without restrictions
- **Powerful Image Editing**: Transform your images with professional-grade tools
- **Document Scanning**: Digitize physical documents with intelligent processing
- **PDF Conversion**: Convert images to PDF with a single click
- **Version Control**: Full undo/redo functionality for all operations
- **Cross-platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

Deploy with Docker in seconds:

```bash
docker run -it -p 8000:8000 -p 2222:2222 -p 3000:3000 navalesnahuel/slurp-tools:latest
```

Then navigate to:
```
http://localhost:2222
```

## 🔧 Tech Stack

- **Backend**: Go (Golang) - Fast and efficient server-side processing
- **Frontend**: SvelteKit 
- **Scanner Microservice**: Python (Uvicorn + FastAPI) - Optimized for image processing
- **Containerization**: Docker - Simple deployment across environments


