package main

import (
	"context"
	"embed"
	"errors"
	"io"
	"log"
	"mime"
	"net/http"
	"path"
	"path/filepath"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

const dist = "frontend/dist"

//go:embed frontend/dist/*
var assets embed.FS

var empty = events.APIGatewayV2HTTPResponse{}

var ErrDir = errors.New("path is dir")

func Read(requestedPath string) (events.APIGatewayV2HTTPResponse, error) {
	f, err := assets.Open(path.Join(dist, requestedPath))
	if err != nil {
		return empty, err
	}
	defer f.Close()

	stat, _ := f.Stat()
	if stat.IsDir() {
		return empty, ErrDir
	}

	contentType := mime.TypeByExtension(filepath.Ext(requestedPath))

	b, err := io.ReadAll(f)
	if err != nil {
		return empty, err
	}

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Headers: map[string]string{
			"Content-Type": contentType,
		},
		Body: string(b),
	}, err
}

func Handle(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	log.Println(req.RawPath)

	res, err := Read(req.RawPath)
	if err == nil {
		return res, nil
	}

	return Read("index.html")
}

func main() {
	lambda.Start(Handle)
}
