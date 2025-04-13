package main

import (
	"github.com/navalesnahuel/slurp-tools/api"
	"github.com/navalesnahuel/slurp-tools/storage"
)

func main() {
	store := storage.NewMemStore()
	imgStore := storage.NewImageStore()

	server := api.NewServer(":3000", store, imgStore)
	server.RunServer()
}
