# Linux path for macOS/Linux graders (and Windows dev machines).
# Default command runs the test suite; override to run headless, e.g.:
#   docker run --rm dao-den-long node src/headless.js --seed 1 --night 1 --ticks 600 --out /dev/stdout
FROM node:26-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]
