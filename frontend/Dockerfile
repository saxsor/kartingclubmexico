FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback + proper headers for PWA assets
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
\n\
  # Service worker must never be cached so updates are detected immediately\n\
  location = /sw.js {\n\
    add_header Cache-Control "no-cache, no-store, must-revalidate";\n\
    try_files $uri =404;\n\
  }\n\
\n\
  # Manifest should revalidate on each visit\n\
  location = /manifest.json {\n\
    add_header Cache-Control "no-cache";\n\
    try_files $uri =404;\n\
  }\n\
\n\
  # Hashed JS/CSS assets can be cached aggressively\n\
  location ~* \\.(js|css)$ {\n\
    add_header Cache-Control "public, max-age=31536000, immutable";\n\
    try_files $uri =404;\n\
  }\n\
\n\
  # SPA fallback\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
