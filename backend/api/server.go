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

	router.HandleFunc("/image/upload", MakeHTTPHandler(s.handleUploadImage))
	router.HandleFunc("/image/filter/{image_id}", MakeHTTPHandler(s.handleApplyFilterToImage))
	router.HandleFunc("/image/{image_id}/undo", MakeHTTPHandler(s.handleUndo))
	router.HandleFunc("/image/{image_id}/redo", MakeHTTPHandler(s.handleRedo))

	http.ListenAndServe(s.listenAddr, router)
}
