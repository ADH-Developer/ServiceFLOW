#---- Base python ----
FROM python:3.9-slim-bullseye as base

ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /src
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt 

# ---- Copy Files/Build ----
FROM base

WORKDIR /src

COPY . /src

RUN chmod -R 777 /src
