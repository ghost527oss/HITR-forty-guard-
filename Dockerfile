# HITR - Single container for Railway / Render / Fly / Koyeb
# Frontend built with Node, served by FastAPI backend = ONE URL

FROM node:18-slim AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci --silent
COPY frontend ./frontend
# Build to ../public (repo root public)
RUN cd frontend && npm run build && ls -lh ../public/ && ls -lh ../public/assets/ | head -n 5

FROM python:3.12-slim
WORKDIR /app

# Install system deps for uvicorn[standard]
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt ./backend/requirements.txt
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt && pip install --no-cache-dir -r requirements.txt

# Copy backend and built frontend
COPY backend ./backend
COPY --from=frontend-build /app/public ./public
COPY api ./api

# Verify files exist in image (debug)
RUN ls -lh public/ && ls -lh public/index.html && echo "--- backend ---" && ls -lh backend/app/

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

# Use shell to expand $PORT from Railway/Render
CMD ["sh", "-c", "echo \"Starting on PORT=$PORT\" && ls -lh public/ && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
