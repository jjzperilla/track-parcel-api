# Use official Node.js LTS image
FROM node:18-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of the application files
COPY . .

# Expose port 3000 for Express
EXPOSE 3000

# Start the application
CMD ["node", "api/track.js"]
