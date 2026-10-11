## 1. Build hai image

Mở terminal tại thư mục `ex03`. Các lệnh dưới đây sử dụng Bash trên Linux, WSL hoặc Git Bash; Docker Desktop cần chạy ở chế độ Linux containers.

```bash
docker build -f Dockerfile.single -t hw-backend:single .
docker build -t hw-backend:multistage .
docker images | grep hw-backend
```

Ứng dụng sử dụng React theo lựa chọn được phép trong đề. `Dockerfile.single` dùng `node:18` để cài phụ thuộc, biên dịch và phục vụ ứng dụng bằng Node.js. `Dockerfile` dùng `node:18-alpine` trong stage `builder` và `nginx:alpine` trong stage `runtime`.

Stage `builder` copy `package.json` và `package-lock.json` trước, chạy `npm ci`, sau đó mới copy mã nguồn và chạy `npm run build`. Stage `runtime` dùng `COPY --from=builder` để lấy thư mục `dist`; cấu hình Nginx nằm riêng trong `nginx.conf`. Image cuối chứa Nginx và bản build React, không chứa Node.js, npm, mã nguồn JSX hay `node_modules`. Cách tách này dựa trên [Multi-stage builds của Docker](https://docs.docker.com/build/building/multi-stage/).

## 2. Đo dung lượng và số lượng layer

```bash
docker image inspect hw-backend:single \
  --format 'Image={{index .RepoTags 0}} | Dung lượng={{.Size}} byte | Layer={{len .RootFS.Layers}}'

docker image inspect hw-backend:multistage \
  --format 'Image={{index .RepoTags 0}} | Dung lượng={{.Size}} byte | Layer={{len .RootFS.Layers}}'

docker history hw-backend:single
docker history hw-backend:multistage
```

Số layer trong bảng là số phần tử của `RootFS.Layers`, có tính cả layer của base image. Các chỉ thị như `ENV`, `EXPOSE`, `HEALTHCHECK` và `CMD` chủ yếu ghi metadata; không đếm số dòng Dockerfile hay số dòng `docker history` để thay thế số filesystem layer.

Docker Engine chưa chạy trong môi trường soạn bài. Các dung lượng, số layer, ID image và log Docker bên dưới là **số liệu minh họa**, chưa phải kết quả đo thực tế. Khi chạy Docker, dùng các lệnh trên để thay bằng kết quả của máy nộp bài. Tag image có thể thay đổi, nên cần đo lại điều kiện dưới 100 MB.

Log minh họa:

```text
$ docker images | grep hw-backend
hw-backend   single       84bcf9f0a244   2 minutes ago   1.18GB
hw-backend   multistage   31ea3cde0244   1 minute ago    68.4MB

Image=hw-backend:single | Dung lượng=1180000000 byte | Layer=15
Image=hw-backend:multistage | Dung lượng=68400000 byte | Layer=10
```

| Tiêu chí | `hw-backend:single` | `hw-backend:multistage` |
| --- | --- | --- |
| Dockerfile | `Dockerfile.single` | `Dockerfile` |
| Số giai đoạn | 1 | 2: `builder` và `runtime` |
| Base image của image cuối | `node:18` | `nginx:alpine` |
| Dung lượng minh họa, MB thập phân | 1.180 MB | 68,4 MB |
| Số filesystem layer minh họa | 15 | 10 |
| Phụ thuộc npm trong image cuối | Có cả phụ thuộc xây dựng | Không có |
| Mã nguồn JSX trong image cuối | Có | Không |
| Sản phẩm biên dịch | Thư mục `dist` | Thư mục `dist` |
| Tiến trình phục vụ HTTP | Node.js | Nginx |
| Cổng container | 3000 | 3000 |
| Cache cài đặt phụ thuộc | Có, do copy manifest trước | Có, do copy manifest trước |
| Đạt dưới 100 MB theo số liệu minh họa | Không | Có |

Công thức tính mức giảm dung lượng:

```text
Mức giảm = (Dung lượng single - Dung lượng multistage) / Dung lượng single × 100%
         = (1.180 - 68,4) / 1.180 × 100%
         ≈ 94,20%
```

Với số liệu minh họa, dung lượng giảm 1.111,6 MB, vượt mức giảm tối thiểu 50–70%. Phần giảm chủ yếu đến từ việc thay base image đầy đủ bằng runtime nhẹ và bỏ phụ thuộc xây dựng. Số layer ít hơn không tự bảo đảm image nhỏ hơn; cần so sánh dung lượng thực tế.

## 3. Kiểm tra Layer Caching

Build lại khi chưa thay đổi file:

```bash
docker build --progress=plain -t hw-backend:multistage .
```

Log minh họa:

```text
#7 [builder 2/8] WORKDIR /app
#7 CACHED
#8 [builder 3/8] COPY package.json package-lock.json ./
#8 CACHED
#9 [builder 4/8] RUN npm ci --no-audit --no-fund
#9 CACHED
#13 [builder 8/8] RUN npm run build
#13 CACHED
```

Thay đổi mã nguồn mà không thay đổi manifest phụ thuộc:

```bash
cp src/main.jsx src/main.jsx.bak
printf '\n// Kiểm tra cache khi thay đổi mã nguồn.\n' >> src/main.jsx
docker build --progress=plain -t hw-backend:multistage .
mv src/main.jsx.bak src/main.jsx
```

Log minh họa sau khi thay đổi mã nguồn:

```text
#8 [builder 3/8] COPY package.json package-lock.json ./
#8 CACHED
#9 [builder 4/8] RUN npm ci --no-audit --no-fund
#9 CACHED
#11 [builder 6/8] COPY src ./src
#11 DONE 0.0s
#13 [builder 8/8] RUN npm run build
#13 DONE 0.5s
```

Lớp `npm ci` được dùng lại vì `package.json` và `package-lock.json` không đổi. Khi thay đổi các file khai báo phụ thuộc, lớp copy manifest và lớp cài phụ thuộc phải chạy lại. `.dockerignore` loại `node_modules`, `dist`, log và file không cần thiết khỏi build context, theo [hướng dẫn tối ưu cache của Docker](https://docs.docker.com/build/cache/optimize/).

## 4. Chạy container và kiểm tra phản hồi

```bash
docker run -d --name hw-single -p 127.0.0.1:3002:3000 hw-backend:single
docker run -d --name hw-multistage -p 127.0.0.1:3000:3000 hw-backend:multistage

curl -i http://127.0.0.1:3002/api/health
curl -i http://127.0.0.1:3000/api/health
curl -I http://127.0.0.1:3000/
docker ps --filter name=hw-
docker inspect hw-multistage --format '{{.State.Health.Status}}'
docker logs hw-multistage
```

Log minh họa của cả hai image:

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"status":"ok","service":"hw-backend","user":"CrouAn244"}

$ curl -I http://127.0.0.1:3000/
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

$ docker inspect hw-multistage --format '{{.State.Health.Status}}'
healthy
```

Mở `http://127.0.0.1:3000` để kiểm tra giao diện React. API `GET /api/health` trả JSON tĩnh từ bản build, phù hợp với phương án React; bài này không thực hiện truy vấn cơ sở dữ liệu. Healthcheck của image multi-stage kiểm tra endpoint này mỗi 10 giây.

Có thể kiểm tra bản build và máy chủ Node.js trực tiếp trước khi chạy Docker:

```bash
npm ci
npm run build
npm test
```

## 5. Dọn container sau khi kiểm tra

```bash
docker rm -f hw-single hw-multistage
```

Khi nộp lên GitHub, đặt nội dung thư mục `ex03` vào `homework/session_10/ex3/`. Nộp `Dockerfile`, `Dockerfile.single`, `README.md` cùng các file mã nguồn, manifest, lockfile và `nginx.conf` để có thể build lại; không nộp `node_modules` và `dist`.
