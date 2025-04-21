package api

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/navalesnahuel/slurp-tools/storage"
)

type APIServer struct {
	listenAddr string
	store      storage.Storer
	imageStore storage.ImageStorer
	// environment map[string]string
}

func NewServer(listenAddr string, store storage.Storer, imgStore storage.ImageStorer) *APIServer {
	return &APIServer{
		listenAddr: listenAddr,
		store:      store,
		imageStore: imgStore,
	}
}

func (s *APIServer) RunServer() {
	fmt.Printf("server running and listening at localhost%s\n", s.listenAddr)
	router := mux.NewRouter()

	router.HandleFunc("/image/upload", Handlers(s.handleUploadImage))
	router.HandleFunc("/image/scan", Handlers(s.handleScanner))
	router.HandleFunc("/image/pdf", Handlers(s.handlerImageToPDF))
	router.HandleFunc("/image/filter/{image_id}", Handlers(s.handleApplyFilterToImage))
	router.HandleFunc("/image/{image_id}/undo", Handlers(s.handleUndo))
	router.HandleFunc("/image/{image_id}/redo", Handlers(s.handleRedo))
	router.HandleFunc("/image/{image_id}/download", Handlers(s.handleServeFile))

	http.ListenAndServe(s.listenAddr, router)
}
