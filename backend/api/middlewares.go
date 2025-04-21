package api

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/navalesnahuel/slurp-tools/util"
)

type APIFunc func(http.ResponseWriter, *http.Request) error

// http handler
func MakeHTTPHandler(f APIFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		err := f(w, r)
		if err != nil {
			if apiError, ok := err.(*APIError); ok {
				util.WriteJSON(w, apiError.Status, apiError)
				return
			}

			util.WriteJSON(w, http.StatusInternalServerError, APIError{Err: "internal server error"})
			return
		}
	}
}

// logger handler
type LoggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lw *LoggingResponseWriter) WriteHeader(code int) {
	lw.statusCode = code
	lw.ResponseWriter.WriteHeader(code)
}

func MakeLoggerHandler(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		lw := &LoggingResponseWriter{ResponseWriter: w, statusCode: 500}
		next.ServeHTTP(lw, r)
		slog.Info(fmt.Sprintf("- %d - %s -%s", lw.statusCode, r.Method, r.URL.String()))
	}
}

// encapsulate handlers
func Handlers(f APIFunc) http.HandlerFunc {
	return MakeLoggerHandler(MakeHTTPHandler(f))
}
