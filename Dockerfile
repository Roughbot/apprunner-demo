# syntax=docker/dockerfile:1

FROM node:20-alpine

WORKDIR /app

# Install deps using lockfile for reproducible builds
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app sources
COPY . .

ENV NODE_ENV=production
ENV PORT=9090

RUN npm run build

EXPOSE 9090

CMD ["npm", "start"]