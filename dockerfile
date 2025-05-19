
# Use Node.js LTS version with Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set environment variables
ENV VITE_API_URL=https://api-rep-dashboard.harx.ai 
ENV VITE_CALLS_API_URL=https://api-calls.harx.ai 
ENV VITE_DASHBOARD_COMPANY_API_URL=https://api-dashboard.harx.ai/api
ENV VITE_BACKEND_URL_GIGS=https://api-gigsmanual.harx.ai/api
ENV VITE_RUN_MODE=standalone
#ENV VITE_RUN_MODE=in-app
ENV VITE_STANDALONE_USER_ID=6814d30f2c1ca099fe2b16b6
ENV VITE_STANDALONE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE0ZDMwZjJjMWNhMDk5ZmUyYjE2YjYiLCJpYXQiOjE3NDYxOTUyOTN9.a90uzRBEG80YGZWlROdZh8fF8lgPUgNkm7oUX5iG1MM
ENV VITE_ASSESSMENT_APP=/repassessments/assessment
ENV VITE_ASSESSMENT_APP_STANDALONE=https://rep-assessments.harx.ai/assessment
ENV VITE_OPENAI_API_KEY=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
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
