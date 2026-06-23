# ---- Builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# API base URL baked at build time (same-origin /api via nginx by default)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Main dashboard host — used to lock custom domains to public pages only
ARG VITE_APP_HOST=
ENV VITE_APP_HOST=$VITE_APP_HOST

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runner (nginx) ----
FROM nginx:1.27-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
