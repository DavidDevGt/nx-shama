FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY ../../package*.json ../../pnpm-lock.yaml ./

# Install all dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the entire monorepo
COPY ../.. .

# Build the inventory app
RUN pnpm nx build inventory-svc

# Expose port
EXPOSE 5001

# Run the app
CMD ["pnpm", "nx", "serve", "inventory-svc"]
