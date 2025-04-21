# Slurp Tools

<img src="/images/slurptools-banner.png" alt="Slurp Tools" width="800" height="300" />

## 🚀 Open Source Virtual Tools to Manage Your Documents and Images

Slurp Tools provides a comprehensive suite of free, open-source utilities to streamline your document and image workflows. Whether you need to edit images, scan documents, or convert files to PDF, Slurp Tools offers an integrated solution with an intuitive interface.

<img src="/images/slurptools-website.png" alt="Slurp Tools Interface" width="100%" />

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
- **Frontend**: SvelteKit - Responsive and reactive UI
- **Scanner Microservice**: Python (Uvicorn + FastAPI) - Optimized for image processing
- **Containerization**: Docker - Simple deployment across environments


