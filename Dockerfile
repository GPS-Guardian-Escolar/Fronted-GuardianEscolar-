FROM node:20-alpine AS build

WORKDIR /app

ARG EXPO_PUBLIC_API_URL=/api
ARG EXPO_PUBLIC_WS_URL=/ws
ARG EXPO_PUBLIC_STUDENT_LINK_BASE_URL=/
ARG EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
ARG EXPO_PUBLIC_WEB_PROXY=true

ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_WS_URL=$EXPO_PUBLIC_WS_URL
ENV EXPO_PUBLIC_STUDENT_LINK_BASE_URL=$EXPO_PUBLIC_STUDENT_LINK_BASE_URL
ENV EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
ENV EXPO_PUBLIC_WEB_PROXY=$EXPO_PUBLIC_WEB_PROXY

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx expo export --platform web

FROM nginx:1.27-alpine

COPY nginx.conf.template /opt/nginx/templates/default.conf.template
COPY docker/40-render-nginx-config.sh /docker-entrypoint.d/40-render-nginx-config.sh
RUN chmod +x /docker-entrypoint.d/40-render-nginx-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
