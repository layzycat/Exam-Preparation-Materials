FROM node:20-alpine
WORKDIR /app
COPY dist ./dist
COPY server.mjs ./server.mjs
COPY cert.pem ./cert.pem
COPY key.pem ./key.pem
ENV PORT=3030
EXPOSE 3030
CMD ["node", "server.mjs"]

