FROM node:lts-alpine

WORKDIR /src

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

RUN apk update \
    && apk upgrade \
    && apk add --no-cache --upgrade bash