# Hướng Dẫn PWA & Vận Hành Trên Mạng Cục Bộ (PWA & Offline Failsafe)

Hệ thống Warehouse HMI được thiết kế như một **Progressive Web App (PWA)** công nghiệp đạt chuẩn, tối ưu hóa cho màn hình cảm ứng điện thoại, máy tính bảng và máy tính công nghiệp (IPC).

---

## 1. Cơ Chế Cache Service Worker & Failsafe An Toàn

### Quy tắc bất khả xâm phạm:
> **Tuyệt đối không cache dữ liệu realtime hoặc command PLC.**

- **Service Worker chỉ cache:** HTML shell, CSS stylesheet, JavaScript bundle, Web Fonts và các biểu tượng SVG/PNG (`globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`).
- **Mọi đường dẫn API và WebSocket** (`/api/*`, `/ws`): Sử dụng chiến lược **`NetworkOnly`**.

### Xử lý sự cố mất kết nối mạng:
Khi điện thoại hoặc máy tính bảng di chuyển ra khỏi vùng phủ sóng WiFi hoặc server Go bị ngắt:
1. WebSocket kích hoạt sự kiện `onclose`.
2. Màn hình lập tức bị khóa bởi overlay toàn màn hình:
   ```
   =============================================
                  SERVER OFFLINE
        Connection to control server lost.
         Control commands are disabled.
         Last update: 10:35:22 AM
   =============================================
   ```
3. Toàn bộ nút bấm thao tác (**CALL ITEM**, **START/STOP CONVEYOR**, **PUSH/RETRACT**) bị vô hiệu hóa tức thì, ngăn chặn operator điều khiển máy bằng trạng thái dữ liệu cũ.

---

## 2. Truy Cập LAN HTTP vs HTTPS

### Phương Án A: Chạy HTTP trong mạng LAN (Demo & Vận hành nội bộ nhanh)
- Truy cập trực tiếp qua địa chỉ IP của máy tính chủ:
  ```
  http://192.168.1.100:8080
  ```
- **Ưu điểm**: Không cần cài đặt chứng chỉ SSL, chạy ngay lập tức trên mọi trình duyệt điện thoại/máy tính bảng kết nối cùng WiFi.
- **Tính năng**: Giao diện full màn hình responsive, WebSocket realtime, offline overlay hoạt động hoàn hảo.

### Phương Án B: Cài đặt PWA đầy đủ với HTTPS nội bộ (Local HTTPS)
Tiêu chuẩn bảo mật của trình duyệt (Chrome, Safari, Edge) yêu cầu **Secure Context (HTTPS)** để hiển thị nút "Install App" hoặc "Add to Home Screen" thành ứng dụng độc lập không thanh địa chỉ.

Để tạo HTTPS cho IP mạng LAN mà không cần kết nối Internet ra bên ngoài:
1. **Dùng công cụ `mkcert`**:
   ```bash
   # Tạo CA cục bộ và chứng chỉ cho IP mạng LAN
   mkcert -install
   mkcert 192.168.1.100 localhost 127.0.0.1
   ```
2. **Reverse Proxy bằng Caddy (Khuyên dùng)**:
   Tạo file `Caddyfile`:
   ```caddy
   https://192.168.1.100:8443 {
       tls 192.168.1.100.pem 192.168.1.100-key.pem
       reverse_proxy localhost:8080
   }
   ```
   Chạy lệnh: `caddy run`.

---

## 3. Cách Cài Đặt Lên Màn Hình Chính Điện Thoại

### Trên Android (Google Chrome):
1. Kết nối điện thoại vào cùng mạng WiFi với máy tính chạy HMI.
2. Mở Chrome và nhập địa chỉ `http://<IP_MAY_TINH>:8080` (hoặc HTTPS).
3. Bấm vào biểu tượng menu `3 chấm` ở góc trên bên phải.
4. Chọn **"Thêm vào màn hình chính"** (Add to Home screen) hoặc **"Cài đặt ứng dụng"** (Install app).
5. Biểu tượng **Warehouse HMI** sẽ xuất hiện trên màn hình điện thoại như một app native.

### Trên iPhone / iPad (Apple Safari):
1. Mở trình duyệt **Safari** và truy cập địa chỉ HMI.
2. Bấm vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên hướng lên ở thanh công cụ dưới).
3. Cuộn xuống và chọn **"Thêm vào MH chính"** (Add to Home Screen).
4. Nhấn **Thêm** (Add). Khi mở từ màn hình chính, HMI sẽ chạy ở chế độ **Standalone Fullscreen** không có thanh URL của trình duyệt.
