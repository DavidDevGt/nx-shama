FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY ../../package*.json ../../pnpm-lock.yaml ./

# Install all dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the entire monorepo
COPY ../.. .

# Build the gateway app
RUN pnpm nx build gateway

# Expose port
EXPOSE 5000

# Run the app
CMD ["pnpm", "nx", "serve", "gateway"]
