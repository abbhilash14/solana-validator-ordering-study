# ==============================================================================
# Solana Validator Block Ordering Measurement Suite
# OpenClaw Autonomous Research Swarm
# ==============================================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies with layer caching
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund || true

# Copy empirical harness, report, and documentation
COPY index.js README.md MEASUREMENT_REPORT.json ./

# Environment defaults: Safe dry-run mode enabled, spend cap enforced
ENV NODE_ENV=production
ENV DRY_RUN=true
ENV SOLANA_RPC=https://api.mainnet-beta.solana.com

# Non-root user execution
USER node

# Default execution entrypoint runs measurement study and outputs clean logs
CMD ["node", "index.js"]
