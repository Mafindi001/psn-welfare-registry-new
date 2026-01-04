# Use Node.js LTS
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create necessary directories
RUN mkdir -p reports logs backups

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if(r.statusCode!==200)throw new Error()})"

# Start command
CMD ["node", "src/index.js"]