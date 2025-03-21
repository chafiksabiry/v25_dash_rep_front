
# Use Node.js LTS version with Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend application
RUN npm run build

# Install serve to host the built files
RUN npm install -g serve

# Set environment variables
ENV VITE_API_URL=http://38.242.212.10:5008/api

# Expose port 3000 for the frontend
EXPOSE 5183

# Start the application using serve
CMD ["serve", "-s", "dist", "-l", "5183"]
