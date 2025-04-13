package storage

import (
	"image"
	"io"
	"os"

	"github.com/navalesnahuel/slurp-tools/types"
)

type Storer interface {
	Save(string, io.Reader) (string, error)
	Delete(string) error
	Load(string) (*os.File, error)
}

type ImageStorer interface {
	LoadImage(string) (image.Image, error)
	SaveImage(image.Image, string) (string, error)
	DeleteImages(string) error
	SaveVersion(string, image.Image) (types.ImageVersion, error)
	LoadLatest(string) (image.Image, error)
	UndoChange(string) (types.ImageVersion, error)
	RedoChange(string) (types.ImageVersion, error)
}
