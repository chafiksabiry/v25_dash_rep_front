# Use Node.js LTS version with Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN apk add --no-cache git

# Build argument for GitHub token (can be passed at build time)
# Can also be set as environment variable: export GITHUB_TOKEN=your_token
# Usage: docker build --build-arg GITHUB_TOKEN=your_token_here .
ARG GITHUB_TOKEN

# Replace the expired token in package.json and package-lock.json with the new token if provided
# Also configure Git to use the token for GitHub URLs as a fallback
RUN OLD_TOKEN="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"; \
    echo "Checking for GITHUB_TOKEN..."; \
    if [ -n "$GITHUB_TOKEN" ]; then \
      echo "✓ GITHUB_TOKEN is set (length: ${#GITHUB_TOKEN})"; \
      echo "Replacing GitHub token in package files..."; \
      sed -i "s|${OLD_TOKEN}|${GITHUB_TOKEN}|g" package.json; \
      if [ -f package-lock.json ]; then \
        echo "Replacing token in package-lock.json..."; \
        COUNT=$(grep -c "${OLD_TOKEN}" package-lock.json || echo "0"); \
        echo "Found ${COUNT} occurrences of old token in package-lock.json"; \
        sed -i "s|${OLD_TOKEN}|${GITHUB_TOKEN}|g" package-lock.json; \
        REMAINING=$(grep -c "${OLD_TOKEN}" package-lock.json || echo "0"); \
        echo "Remaining occurrences after replacement: ${REMAINING}"; \
      fi; \
      echo "Configuring Git URL rewriting for GitHub..."; \
      git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"; \
      git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://${OLD_TOKEN}@github.com/"; \
      echo "✓ GitHub token configured successfully"; \
    else \
      echo "✗ ERROR: GITHUB_TOKEN not provided!"; \
      echo "Please provide GITHUB_TOKEN as build arg or environment variable:"; \
      echo "  docker build --build-arg GITHUB_TOKEN=your_token ."; \
      echo "  OR: export GITHUB_TOKEN=your_token && docker build ."; \
      exit 1; \
    fi

# Set environment variables
ENV VITE_API_URL=https://api-rep-dashboard.harx.ai
ENV VITE_CALLS_API_URL=https://api-dash-calls.harx.ai
ENV VITE_DASHBOARD_COMPANY_API_URL=https://api-dashboard.harx.ai/api
ENV VITE_BACKEND_URL_GIGS=https://api-gigsmanual.harx.ai/api
#ENV VITE_RUN_MODE=standalone
ENV VITE_RUN_MODE=in-app
ENV VITE_STANDALONE_USER_ID=6814d30f2c1ca099fe2b16b6
ENV VITE_STANDALONE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODE0ZDMwZjJjMWNhMDk5ZmUyYjE2YjYiLCJpYXQiOjE3NDYxOTUyOTN9.a90uzRBEG80YGZWlROdZh8fF8lgPUgNkm7oUX5iG1MM
ENV VITE_ASSESSMENT_APP=/repassessments/assessment
ENV VITE_ASSESSMENT_APP_STANDALONE=https://rep-assessments.harx.ai/assessment
#twilio&calls
ENV VITE_TWILIO_ACCOUNT_SID=AC8a453959a6cb01cbbd1c819b00c5782f
ENV VITE_TWILIO_AUTH_TOKEN=7ade91a170bff98bc625543287ee62c8
ENV VITE_WS_URL=wss://api-dash-calls.harx.ai/speech-to-text
ENV VITE_API_URL_AI_MESSAGES=https://api-messages-service.harx.ai/api
ENV VITE_API_URL_CALL=https://api-dash-calls.harx.ai
ENV VITE_REP_API_URL=https://api-repcreationwizard.harx.ai
ENV VITE_AUTH_API_URL=https://api-registration.harx.ai/api
ENV VITE_FRONT_URL=https://rep-dashboard.harx.ai/
ENV VITE_DASH_COMPANY_BACKEND=https://api-dashboard.harx.ai/api
ENV VITE_MATCHING_API_URL=https://api-matching.harx.ai/api
ENV VITE_TRAINING_API_URL=https://api-training.harx.ai
ENV VITE_COPILOT_URL=/copilot
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
