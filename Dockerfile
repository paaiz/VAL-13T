FROM node:22-bookworm-slim

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application source
COPY src ./src

# Ensure persistent SQLite data directory exists
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

CMD ["node", "--no-warnings", "src/index.js"]
