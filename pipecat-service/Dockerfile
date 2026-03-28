FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data required by pipecat-ai's RTVI text processor.
# Must run as root before USER appuser (appuser home is /nonexistent).
# Must use explicit download_dir — a path NLTK searches at runtime.
RUN python -c "import nltk; nltk.download('punkt_tab', download_dir='/usr/local/share/nltk_data', quiet=True)"

COPY . .

EXPOSE 8000

RUN addgroup --system appgroup && adduser --system --disabled-password --gecos "" --ingroup appgroup appuser
USER appuser

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
