FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY package*.json ./
RUN npm install

COPY . .

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]