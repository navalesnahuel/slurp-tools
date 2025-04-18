package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"math"
	"net/http"
	"time"

	"codeberg.org/go-pdf/fpdf"
	"github.com/gorilla/mux"
	"github.com/navalesnahuel/slurp-tools/types"
	"github.com/navalesnahuel/slurp-tools/util"
)

func (sv *APIServer) handleUploadImage(w http.ResponseWriter, r *http.Request) error {
	file, header, err := r.FormFile("image")
	if err != nil {
		return NewAPIError(err, 400)
	}

	imageProps, err := sv.processImageUpload(file, header)
	if err != nil {
		return NewAPIError(err, 400)
	}

	return util.WriteJSON(w, 201, imageProps)
}

func (sv *APIServer) handleApplyFilterToImage(w http.ResponseWriter, r *http.Request) error {
	vars := mux.Vars(r)
	imageID, ok := vars["image_id"]

	if !ok {
		return NewAPIError("provide a valid image id", 400)
	}

	img, err := sv.imageStore.LoadLatest(imageID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	var filterRequests []types.FilterRequest
	err = json.NewDecoder(r.Body).Decode(&filterRequests)
	if err != nil {
		return NewAPIError(err, 400)
	}

	imgProps, err := sv.applyFiltersToImage(filterRequests, img, imageID)

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

func (sv *APIServer) handleServeFile(w http.ResponseWriter, r *http.Request) error {
	vars := mux.Vars(r)
	imageID, ok := vars["image_id"]
	if !ok {
		return NewAPIError("provide a valid image id", 400)
	}

	img, err := sv.imageStore.LoadLatest(imageID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return NewAPIError("failed to encode image", 500)
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Length", fmt.Sprint(buf.Len()))

	http.ServeContent(w, r, imageID+".png", time.Now(), bytes.NewReader(buf.Bytes()))
	return nil
}

func (sv *APIServer) handleScanner(w http.ResponseWriter, r *http.Request) error {
	file, header, err := r.FormFile("image")
	if err != nil {
		return NewAPIError(err, 400)
	}
	defer file.Close()

	pointsStr := r.FormValue("points")
	var points [][]int
	if pointsStr == "" {
		return NewAPIError(fmt.Errorf("points are required"), 400)
	}

	err = json.Unmarshal([]byte(pointsStr), &points)
	if err != nil {
		return NewAPIError(err, 400)
	}

	imageProperties, err := sv.processImageUpload(file, header)
	if err != nil {
		return NewAPIError(err, 400)
	}

	img, err := sv.imageStore.LoadLatest(imageProperties.UUID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	resp, err := sv.sendImageToScanner(img, imageProperties.UUID, points)
	if err != nil {
		return NewAPIError(err, 500)
	}
	defer resp.Body.Close()

	scannedImage, _, err := image.Decode(resp.Body)
	if err != nil {
		return NewAPIError(fmt.Errorf("could not decode image from scanner: %w", err), 500)
	}

	imageFilters, err := sv.applyFiltersToImage(ScanFilterPayload, scannedImage, imageProperties.UUID)
	if err != nil {
		return NewAPIError(err, 400)
	}

	return util.WriteJSON(w, 200, imageFilters)
}

func (sv *APIServer) handlerImageToPDF(w http.ResponseWriter, r *http.Request) error {
	err := r.ParseMultipartForm(55 << 20)
	if err != nil {
		return NewAPIError(err, 400)
	}
	form := r.MultipartForm
	files := form.File["image"]

	pdf := fpdf.New("P", "mm", "A4", "")
	const maxWidth = 190.0
	const maxHeight = 277.0

	for _, fileHeader := range files {
		file, err := fileHeader.Open()
		if err != nil {
			continue
		}
		defer file.Close()

		img, _, err := image.Decode(file)
		if err != nil {
			return NewAPIError("failed to decode image", 400)
		}

		width := float64(img.Bounds().Dx())
		height := float64(img.Bounds().Dy())

		scale := math.Min(maxWidth/width, maxHeight/height)
		displayWidth := width * scale
		displayHeight := height * scale

		var buf bytes.Buffer
		if err := png.Encode(&buf, img); err != nil {
			return NewAPIError("failed to encode image", 500)
		}

		imgName := fileHeader.Filename
		options := fpdf.ImageOptions{ReadDpi: false, ImageType: "PNG"}
		pdf.AddPage()
		pdf.RegisterImageOptionsReader(imgName, options, &buf)

		x := (210 - displayWidth) / 2  // Center horizontally
		y := (297 - displayHeight) / 2 // Center vertically

		pdf.ImageOptions(imgName, x, y, displayWidth, displayHeight, false, options, 0, "")

	}
	var pdfBuf bytes.Buffer
	err = pdf.Output(&pdfBuf)
	if err != nil {
		return NewAPIError("failed to generate PDF", 500)
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=slurptools.pdf")
	w.WriteHeader(http.StatusOK)

	_, err = w.Write(pdfBuf.Bytes())
	if err != nil {
		return NewAPIError("failed to send PDF", 500)
	}
	return nil
}
