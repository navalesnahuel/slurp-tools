package storage

import (
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/navalesnahuel/slurp-tools/types"
)

type ImageStore struct {
	tempDir string
	images  map[string][]types.ImageVersion
	current map[string]int
}

func NewImageStore() *ImageStore {
	tempDir := "./tmp/images/"
	err := os.MkdirAll(tempDir, os.ModePerm)
	if err != nil {
		log.Fatal(err)
	}

	return &ImageStore{
		tempDir: tempDir,
		images:  make(map[string][]types.ImageVersion),
		current: make(map[string]int),
	}
}

func (s *ImageStore) SaveImage(img image.Image, fileName string) (string, error) {
	ext := filepath.Ext(fileName)

	fullPath := filepath.Join(s.tempDir, fileName)
	file, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	switch strings.ToLower(ext) {
	case ".png":
		err = png.Encode(file, img)
	case ".jpg", ".jpeg", "":
		err = jpeg.Encode(file, img, nil)
	default:
		return "", fmt.Errorf("unsupported image format: %s", ext)
	}

	if err != nil {
		return "", err
	}

	return file.Name(), nil
}

func (s *ImageStore) LoadImage(path string) (image.Image, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	img, _, err := image.Decode(f)
	if err != nil {
		return nil, err
	}

	return img, nil
}

func (s *ImageStore) DeleteImages(path string) error {
	return os.Remove(path)
}

func (s *ImageStore) SaveVersion(uuid string, img image.Image) (types.ImageVersion, error) {
	versions := s.images[uuid]
	currentIdx := s.current[uuid]

	if currentIdx < len(versions)-1 {
		versions = versions[:currentIdx+1]
		s.images[uuid] = versions
	}

	newVersion := len(versions)
	filename := generateFilename(uuid, newVersion)
	path, err := s.SaveImage(img, filename)
	if err != nil {
		return types.ImageVersion{}, err
	}

	v := types.ImageVersion{
		UUID:     uuid,
		Version:  newVersion,
		FilePath: path,
	}

	s.images[uuid] = append(s.images[uuid], v)
	s.current[uuid] = newVersion
	return v, nil
}

func (s *ImageStore) LoadLatest(uuid string) (image.Image, error) {
	idx, ok := s.current[uuid]
	if !ok || len(s.images[uuid]) == 0 {
		return nil, fmt.Errorf("no versions found for uuid %s", uuid)
	}
	return s.LoadImage(s.images[uuid][idx].FilePath)
}

func (s *ImageStore) UndoChange(uuid string) (types.ImageVersion, error) {
	current, ok := s.current[uuid]
	if !ok || current <= 0 {
		return types.ImageVersion{}, fmt.Errorf("nothing to undo for %s", uuid)
	}

	s.current[uuid] = current - 1
	return s.images[uuid][s.current[uuid]], nil
}

func (s *ImageStore) RedoChange(uuid string) (types.ImageVersion, error) {
	current, ok := s.current[uuid]
	versions := s.images[uuid]

	if !ok || current >= len(versions)-1 {
		return types.ImageVersion{}, fmt.Errorf("nothing to redo for %s", uuid)
	}

	s.current[uuid] = current + 1
	return versions[s.current[uuid]], nil
}

func generateFilename(uuid string, version int) string {
	return fmt.Sprintf("%s__v%d.jpg", uuid, version)
}
