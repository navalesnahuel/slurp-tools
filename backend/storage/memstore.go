package storage

import (
	"io"
	"log"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

type MemStore struct {
	tempDir string
}

func NewMemStore() *MemStore {
	tempDir := "./tmp/files/"
	err := os.MkdirAll(tempDir, os.ModePerm)
	if err != nil {
		log.Fatal(err)
	}

	return &MemStore{tempDir: tempDir}
}

func (m *MemStore) Save(name string, data io.Reader) (string, error) {
	ext := filepath.Ext(name)
	uniqueID := uuid.NewString()
	fullPath := filepath.Join(m.tempDir, uniqueID+ext)
	file, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}

	defer file.Close()

	_, err = io.Copy(file, data)
	if err != nil {
		return "", err
	}

	return file.Name(), nil
}

func (m *MemStore) Delete(path string) error {
	return os.Remove(path)
}

func (m *MemStore) Load(path string) (*os.File, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	return f, nil
}
