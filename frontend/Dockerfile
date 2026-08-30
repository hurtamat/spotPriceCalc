# Frontend: build the Vite/React app, then serve the static bundle with nginx.
FROM node:22-alpine AS build
WORKDIR /app

# Base URL of the .NET API, baked into the bundle at BUILD time (Vite inlines VITE_* env vars).
# Override per environment: docker build --build-arg VITE_API_BASE_URL=https://api.example.com
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
