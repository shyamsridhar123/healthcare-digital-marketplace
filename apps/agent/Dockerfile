FROM node:20-alpine
WORKDIR /app

# npm resilience for large preview-package installs
RUN npm config set fetch-retries 6 \
 && npm config set fetch-retry-maxtimeout 180000 \
 && npm config set fetch-retry-mintimeout 15000 \
 && npm config set fetch-timeout 300000

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3978
ENV PORT=3978
CMD ["node", "dist/index.js"]
