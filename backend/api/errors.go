package api

import (
	"net/http"
)

type APIError struct {
	Err    string `json:"error"`
	Status int    `json:"-"`
}

func (e *APIError) Error() string {
	return e.Err
}

func NewAPIError(err any, status int) *APIError {
	var errStr string

	switch e := err.(type) {
	case error:
		errStr = e.Error()
	case string:
		errStr = e
	default:
		errStr = "unkown error"
	}

	return &APIError{
		Err:    errStr,
		Status: status,
	}
}

var (
	ErrorBadRequest          = NewAPIError("the request could not be understood or was missing required parameters.", http.StatusBadRequest)
	ErrorUnauthorized        = NewAPIError("authentication is required and has failed or has not been provided.", http.StatusUnauthorized)
	ErrorForbidden           = NewAPIError("you do not have the necessary permissions to access this resource.", http.StatusForbidden)
	ErrorNotFound            = NewAPIError("the requested resource could not be found.", http.StatusNotFound)
	ErrorMethodNotAllowed    = NewAPIError("the HTTP method used is not allowed for this endpoint.", http.StatusMethodNotAllowed)
	ErrorConflict            = NewAPIError("a conflict occurred with the current state of the resource.", http.StatusConflict)
	ErrorUnprocessableEntity = NewAPIError("the request was well-formed but could not be processed due to semantic errors.", http.StatusUnprocessableEntity)

	ErrorInternalServer     = NewAPIError("an unexpected internal server error occurred.", http.StatusInternalServerError)
	ErrorNotImplemented     = NewAPIError("this functionality is not implemented.", http.StatusNotImplemented)
	ErrorBadGateway         = NewAPIError("the server received an invalid response from an upstream server.", http.StatusBadGateway)
	ErrorServiceUnavailable = NewAPIError("the service is temporarily unavailable. Please try again later.", http.StatusServiceUnavailable)
	ErrorGatewayTimeout     = NewAPIError("the server did not receive a timely response from an upstream server.", http.StatusGatewayTimeout)
)
