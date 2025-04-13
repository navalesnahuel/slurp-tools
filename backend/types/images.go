package types

import (
	"fmt"
	"path"
)

// Image versioning model
type ImageVersion struct {
	UUID     string
	Version  int
	FilePath string
}

// Validate Images logic
type ValidImageExtension int

const (
	ValidImagePNG ValidImageExtension = iota
	ValidImageJPEG
	ValidImageJPG
	ValidImageHMAC
)

var ValidImageExt = map[ValidImageExtension]string{
	ValidImagePNG:  ".png",
	ValidImageJPEG: ".jpeg",
	ValidImageJPG:  ".jpg",
	ValidImageHMAC: ".hmac",
}

func ValidateImage(imagePath string) error {
	imageExt := path.Ext(imagePath)
	for _, ext := range ValidImageExt {
		if imageExt == ext {
			return nil
		}
	}

	return fmt.Errorf("the image is not of a valid type")
}
