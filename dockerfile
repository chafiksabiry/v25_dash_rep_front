
# Use Node.js LTS version with Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV VITE_API_URL=https://preprod-api-rep-dashboard.harx.ai 
ENV VITE_CALLS_API_URL=https://preprod-api-dash-calls.harx.ai 
ENV VITE_DASHBOARD_COMPANY_API_URL=https://preprod-api-dashboard.harx.ai/api
ENV VITE_BACKEND_URL_GIGS=https://preprod-api-gigsmanual.harx.ai/api

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the frontend application
RUN npm run build

# Install serve to host the built files
RUN npm install -g serve

# Expose port 3000 for the frontend
EXPOSE 5183

# Start the application using serve
CMD ["serve", "-s", "dist", "-l", "5183"]
