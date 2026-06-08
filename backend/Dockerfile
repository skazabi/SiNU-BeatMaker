FROM python:3.11-slim

WORKDIR /app

# Sadece gereksinimleri kopyalayip kuruyoruz (cache mekanizmasini bozmamak ve hizli kurulum icin)
COPY requirements.txt .

# Gereksiz onbellek dosyalarini saklamayarak indirilen boyutu minimize ediyoruz
RUN pip install --no-cache-dir -r requirements.txt

# Proje dosyalarini kopyaliyoruz
COPY . .

EXPOSE 8000

# Uvicorn ile FastAPI'yi baslatiyoruz
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
