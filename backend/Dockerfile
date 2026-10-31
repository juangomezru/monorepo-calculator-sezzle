FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /calculator ./cmd/api

FROM alpine:3.20
RUN adduser -D -H -u 10001 appuser
COPY --from=build /calculator /calculator
USER appuser
EXPOSE 8080
ENTRYPOINT ["/calculator"]
