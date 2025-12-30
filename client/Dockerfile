FROM node:18-alpine AS build
WORKDIR /app

COPY client/package.json client/package-lock.json* ./
RUN npm install

COPY client ./
RUN npm run build --silent

FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist/client /usr/share/nginx/html
COPY client/render.yaml /usr/share/nginx/html/render.yaml

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
