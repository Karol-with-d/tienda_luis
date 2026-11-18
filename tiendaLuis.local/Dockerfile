FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src
COPY data ./data

RUN npm run build

EXPOSE 7000

CMD ["npm", "start"]
