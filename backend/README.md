# Chrome HTTP Traffic Capture & Forward - Backend API

A lightweight Flask API that receives HTTP traffic captures from the Chrome extension and logs them.

## Setup

### Prerequisites
- Python 3.8+
- `uv` package manager

### Installation

```bash
# Navigate to backend directory
cd backend/

# Install dependencies (uv will create a virtual environment)
uv sync
```

### Running the API

```bash
# Activate the virtual environment
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows

# Run the Flask app
python main.py
```

The API will start on `http://localhost:8000`

## Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-11T09:19:04.149Z"
}
```

### `GET /stats`
Get capture statistics.

**Response:**
```json
{
  "total_captures": 42,
  "last_capture": 1704067200000
}
```

### `POST /capture`
Receive HTTP traffic captures from the extension.

**Single Capture Request:**
```json
{
  "timestamp": 1704067200000,
  "tabId": 12345,
  "request": {
    "method": "GET",
    "url": "https://api.example.com/users",
    "headers": {...}
  },
  "response": {
    "status": 200,
    "headers": {...},
    "body": "{...}"
  }
}
```

**Batch Capture Request:**
```json
{
  "captures": [
    { "timestamp": 1, "request": {...}, "response": {...} },
    { "timestamp": 2, "request": {...}, "response": {...} }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "received": 2
}
```

## Development

### Logs
All captures are logged to:
- Console (stdout)
- `captures.log` file

### Storage
Currently uses in-memory storage (data lost on restart). For persistence, integrate with:
- SQLite
- PostgreSQL
- File-based storage

## CORS
CORS is enabled for all origins to allow the Chrome extension to communicate with the API.
