# Multi-stage Dockerfile for Warehouse HMI

# 1. Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Build Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o /app/warehouse-hmi cmd/server/main.go

# 3. Final Minimal Runtime Image
FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=backend-builder /app/warehouse-hmi /app/warehouse-hmi
COPY --from=frontend-builder /app/frontend/dist /app/dist
COPY configs/plc-map.yaml /app/configs/plc-map.yaml
COPY .env.example /app/.env

# Persistent storage for SQLite database & logs
VOLUME [ "/app/data" ]

EXPOSE 8080

ENTRYPOINT ["/app/warehouse-hmi", "-env", "/app/.env", "-plc-map", "/app/configs/plc-map.yaml"]
