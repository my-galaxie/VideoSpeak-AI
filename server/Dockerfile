FROM node:18-alpine

# Install ffmpeg for audio processing
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create directories for logs and temp files
RUN mkdir -p logs temp

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]