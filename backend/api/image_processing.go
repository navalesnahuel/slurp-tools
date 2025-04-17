package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"mime/multipart"
	"net/http"

	"github.com/disintegration/gift"
	"github.com/google/uuid"
	"github.com/navalesnahuel/slurp-tools/types"
)

type ScannerRequest struct {
	Image  image.Image `json:"image"`
	Points [][]int     `json:"points"`
}

var ScanFilterPayload = []types.FilterRequest{
	{Filter: "grayscale"},
	{Filter: "scanify"},
	{Filter: "median", Params: json.RawMessage(`{"radius": 1, "alpha": false}`)},
	{Filter: "brightness", Params: json.RawMessage(`{"percentage": 15.0}`)},
	{Filter: "contrast", Params: json.RawMessage(`{"percentage": 60.0}`)},
	{Filter: "unsharpmask", Params: json.RawMessage(`{"sigma": 1.5, "amount": 1.0, "threshold": 0.5}`)},
}

func (sv *APIServer) processImageUpload(file multipart.File, header *multipart.FileHeader) (types.ImageVersion, error) {
	defer file.Close()
	err := types.ValidateImage(header.Filename)
	if err != nil {
		return types.ImageVersion{}, err
	}
	imgDecoded, _, err := image.Decode(file)
	if err != nil {
		return types.ImageVersion{}, err
	}
	fileID := uuid.NewString()
	imageProps, err := sv.imageStore.SaveVersion(fileID, imgDecoded)
	if err != nil {
		return types.ImageVersion{}, err
	}

	return imageProps, nil
}

func (sv *APIServer) applyFiltersToImage(filters []types.FilterRequest, image image.Image, imageID string) (types.ImageVersion, error) {
	giftFilters := make([]gift.Filter, 0, len(filters))
	for _, fr := range filters {
		filter, err := types.CreateFilter(fr)
		if err != nil {
			return types.ImageVersion{}, err
		}
		giftFilters = append(giftFilters, filter.ToGift())
	}

	imgWithFilters := types.ApplyFilters(image, giftFilters...)

	imgProperties, err := sv.imageStore.SaveVersion(imageID, imgWithFilters)
	if err != nil {
		return types.ImageVersion{}, err
	}

	return imgProperties, nil
}

func (sv *APIServer) sendImageToScanner(image image.Image, uuid string, points [][]int) (*http.Response, error) {
	var buf bytes.Buffer
	err := jpeg.Encode(&buf, image, nil)
	if err != nil {
		return nil, fmt.Errorf("could not encode image: %w", err)
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	imagePart, err := writer.CreateFormFile("file", "image.jpg") // 👈 CAMBIADO de "image" a "file"
	if err != nil {
		return nil, fmt.Errorf("could not create image form field: %w", err)
	}
	_, err = imagePart.Write(buf.Bytes())
	if err != nil {
		return nil, fmt.Errorf("could not write image to form: %w", err)
	}

	pointsJSON, err := json.Marshal(points)
	if err != nil {
		return nil, fmt.Errorf("could not marshal points: %w", err)
	}
	err = writer.WriteField("points", string(pointsJSON))
	if err != nil {
		return nil, fmt.Errorf("could not write points to form: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("could not close multipart writer: %w", err)
	}

	req, err := http.NewRequest("POST", "http://localhost:8000/scanner", body)
	if err != nil {
		return nil, fmt.Errorf("could not create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("could not send request: %w", err)
	}

	return resp, nil
}
