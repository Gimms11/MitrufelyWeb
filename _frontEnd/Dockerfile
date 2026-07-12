# ─── Stage 1: Build de producción con Node ────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copiar package.json y lockfile para aprovechar cache de Docker
COPY package.json package-lock.json ./

# Instalar dependencias (incluye devDeps para el build)
RUN npm ci

# Copiar el código fuente
COPY . .

# Declarar variables de entorno requeridas en tiempo de build por Vite
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_BASE_URL

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build de producción (genera dist/ con chunks minificados + .br + .gz)
RUN npm run build

# ─── Stage 2: Servir con nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copiar los archivos pre-comprimidos (.br, .gz) generados por vite-plugin-compression2
COPY --from=build /app/dist /usr/share/nginx/html

# Configuración de nginx: gzip estático + on-the-fly, cache headers, SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
