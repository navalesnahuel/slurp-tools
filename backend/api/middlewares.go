package api

import (
	"net/http"

	"github.com/navalesnahuel/slurp-tools/util"
)

type APIFunc func(http.ResponseWriter, *http.Request) error

func MakeHTTPHandler(f APIFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := f(w, r)
		if err != nil {
			if apiError, ok := err.(*APIError); ok {
				util.WriteJSON(w, apiError.Status, apiError)
				return
			}

			util.WriteJSON(w, http.StatusInternalServerError, APIError{Err: "internal server error"})
		}
	}
}
