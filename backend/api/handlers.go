package api

import (
	"encoding/json"
	"image"
	"net/http"

	"github.com/disintegration/gift"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/navalesnahuel/slurp-tools/types"
	"github.com/navalesnahuel/slurp-tools/util"
)

func (sv *APIServer) handleUploadImage(w http.ResponseWriter, r *http.Request) error {
	file, header, err := r.FormFile("image")
	if err != nil {
		return NewAPIError(err, 400)
	}
	defer file.Close()

	err = types.ValidateImage(header.Filename)
	if err != nil {
		return NewAPIError(err, 400)
	}

	img, _, err := image.Decode(file)
	if err != nil {
		return NewAPIError("no se pudo decodificar la imagen", 400)
	}

	fileID := uuid.NewString()

	imageProps, err := sv.imageStore.SaveVersion(fileID, img)
	if err != nil {
		return NewAPIError(err, 400)
	}
	return util.WriteJSON(w, 201, imageProps)
}

func (sv *APIServer) handleApplyFilterToImage(w http.ResponseWriter, r *http.Request) error {
	vars := mux.Vars(r)
	ImageID, ok := vars["image_id"]

	if !ok {
		return NewAPIError("provide a valid image id", 400)
	}

	img, err := sv.imageStore.LoadLatest(ImageID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	var filterRequests []types.FilterRequest
	err = json.NewDecoder(r.Body).Decode(&filterRequests)
	if err != nil {
		return NewAPIError(err, 400)
	}

	giftFilters := make([]gift.Filter, 0, len(filterRequests))
	for _, fr := range filterRequests {
		filter, err := types.CreateFilter(fr)
		if err != nil {
			return NewAPIError(err, 400)
		}
		giftFilters = append(giftFilters, filter.ToGift())
	}

	imgWithFilters := types.ApplyFilters(img, giftFilters...)

	imgProps, err := sv.imageStore.SaveVersion(ImageID, imgWithFilters)
	if err != nil {
		return NewAPIError(err, 400)
	}

	return util.WriteJSON(w, 201, imgProps)
}

func (sv *APIServer) handleUndo(w http.ResponseWriter, r *http.Request) error {
	vars := mux.Vars(r)
	ImageID, ok := vars["image_id"]

	if !ok {
		return NewAPIError("provide a valid image id", 400)
	}

	img, err := sv.imageStore.UndoChange(ImageID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	return util.WriteJSON(w, 200, img)
}

func (sv *APIServer) handleRedo(w http.ResponseWriter, r *http.Request) error {
	vars := mux.Vars(r)
	ImageID, ok := vars["image_id"]

	if !ok {
		return NewAPIError("provide a valid image id", 400)
	}

	img, err := sv.imageStore.RedoChange(ImageID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	return util.WriteJSON(w, 200, img)
}
