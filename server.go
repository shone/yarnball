package main
import (
  "net/http"
  "io/ioutil"
  "log"
  "os"
)

func main() {
  http.Handle("/", http.FileServer(http.Dir(".")))
  
  http.HandleFunc("/load", func(response http.ResponseWriter, request *http.Request) {
    if request.Method != "GET" {
      response.WriteHeader(http.StatusBadRequest)
      response.Write([]byte("Method not supported"))
      return
    }
    paths,hasPath := request.URL.Query()["path"]
    if !hasPath {
      response.WriteHeader(http.StatusBadRequest)
      response.Write([]byte("Missing path query"))
      return
    }
    path := paths[0]
    content,err := ioutil.ReadFile(path)
    if err != nil {
      pathError,isPathError := err.(*os.PathError)
      if isPathError {
        if pathError.Err.Error() == "no such file or directory" {
          response.WriteHeader(http.StatusNotFound)
          response.Write([]byte(pathError.Err.Error()))
          return
        }
      }
      response.WriteHeader(http.StatusInternalServerError)
      return
    }
    response.Write(content)
  })

  http.HandleFunc("/save", func(response http.ResponseWriter, request *http.Request) {
    if request.Method != "PUT" {
      response.WriteHeader(http.StatusBadRequest)
      response.Write([]byte("Method not supported"))
      return
    }
    paths,hasPath := request.URL.Query()["path"]
    if !hasPath {
      response.WriteHeader(http.StatusBadRequest)
      response.Write([]byte("Missing path query"))
      return
    }
    path := paths[0]
    defer request.Body.Close()
    body,err := ioutil.ReadAll(request.Body)
    if err != nil {
      response.WriteHeader(http.StatusInternalServerError)
      response.Write([]byte("Could not read request body"))
      return
    }
    ioutil.WriteFile(path, body, 0644)
  })
  
  log.Println("Serving on port 8089..")
  if err := http.ListenAndServe(":8089", nil); err != nil {
    panic(err)
  }
}
