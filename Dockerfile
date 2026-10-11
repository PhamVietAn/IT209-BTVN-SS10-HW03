# Giai đoạn 1: cài đặt phụ thuộc và biên dịch ứng dụng React.
FROM node:18-alpine AS builder
WORKDIR /app

# Giữ lớp cài đặt phụ thuộc khi chỉ thay đổi mã nguồn.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY build.cjs ./
COPY src ./src
COPY public ./public
RUN npm run build

# Giai đoạn 2: chỉ giữ Nginx và sản phẩm đã biên dịch.
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
