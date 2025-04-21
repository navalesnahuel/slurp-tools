# Slurp Tools
<img src="/images/slurptools-banner.png" alt="Slurp Tools" />

## Open Source virtual tools to manage your documents and images. 
Slurp Tools provides a comprehensive suite of free, open-source utilities to streamline your document and image workflows. Whether you need to edit images, scan documents, or convert files to PDF, Slurp Tools offers an integrated solution with an intuitive interface.

<img src="/images/slurptools-website.png" alt="Slurp Tools" />

## Features
- Free & open-source.
- Undo and Redo
- Image Edition
- Scanning Images
- Images to PDF


## Quick Start
```bash
docker run -it -p 8000:8000 -p 2222:2222 -p 3000:3000 navalesnahuel/slurp-tools:latest
```

Then navigate to:
```
http://localhost:2222
```

## Tech Stack
- **Backend**: Go (Golang) - Fast and efficient server-side processing
- **Frontend**: SvelteKit - Responsive and reactive UI
- **Scanner Microservice**: Python (Uvicorn + FastAPI) - Optimized for image processing
- **Containerization**: Docker - Simple deployment across environments




