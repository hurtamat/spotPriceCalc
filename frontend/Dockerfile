# Frontend: build the Vite/React app, then serve the static bundle with nginx.
#
# The build context is the REPO ROOT, not frontend/, because src/shelly/generate.ts imports the
# minified device scripts from ../../../scripts/shelly/dist, which sits outside this package.
# The image mirrors the repo layout so those relative paths resolve as they do in a checkout.
#   docker build -f frontend/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo/frontend

# Base URL of the .NET API, baked into the bundle at BUILD time (Vite inlines VITE_* env vars).
# Override per environment: --build-arg VITE_API_BASE_URL=https://api.example.com
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install deps first for layer caching.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Before the app sources: these change far less often than the frontend does.
COPY scripts/shelly/dist /repo/scripts/shelly/dist
COPY frontend/ ./
RUN npm run build

# --- Serve stage ---
FROM nginx:1.27-alpine AS final
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
