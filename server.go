package main

import (
	"io/ioutil"
	"net/http"
	"os"
	"errors"
)

func main() {
	http.Handle("/", NoCache(http.FileServer(http.Dir("."))))

	http.HandleFunc("/load", handleLoad)
	http.HandleFunc("/save", handleSave)

	err := http.ListenAndServe(":8089", nil)
	panic(err)
}

func NoCache(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Cache-Control", "must-revalidate")
		handler.ServeHTTP(writer, request)
	})
}

func handleLoad(response http.ResponseWriter, request *http.Request) {
	if request.Method != "GET" {
		http.Error(response, "Method not supported", http.StatusBadRequest)
		return
	}

	paths, hasPath := request.URL.Query()["path"]
	if !hasPath {
		http.Error(response, "Missing path query", http.StatusBadRequest)
		return
	}

	path := paths[0]

	content, err := ioutil.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			http.Error(response, err.Error(), http.StatusNotFound)
		} else {
			http.Error(response, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	response.Write(content)
}

func handleSave(response http.ResponseWriter, request *http.Request) {
	if request.Method != "PUT" {
		http.Error(response, "Method not supported", http.StatusBadRequest)
		return
	}

	paths, hasPath := request.URL.Query()["path"]
	if !hasPath {
		http.Error(response, "Missing path query", http.StatusBadRequest)
		return
	}

	path := paths[0]

	body, err := ioutil.ReadAll(request.Body)
	if err != nil {
		http.Error(response, "Could not read request body", http.StatusInternalServerError)
		return
	}
	defer request.Body.Close()

	ioutil.WriteFile(path, body, 0644)
}
