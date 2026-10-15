# Hướng Dẫn Triển Khai Trên Hệ Điều Hành Windows (Deployment Guide)

Tài liệu này hướng dẫn chi tiết cách thiết lập máy tính chạy Windows làm máy chủ điều khiển trung tâm (Edge HMI Gateway), kết nối đồng thời với PLC vật lý qua cổng mạng LAN và phát Web HMI cho điện thoại/máy tính bảng qua WiFi.

---

## 1. Mô Hình Kết Nối Thực Tế Tại Nhà Xưởng

```
         ┌────────────────────────┐
         │     PLC VẬT LÝ         │ (IP: 192.168.1.20)
         └───────────┬────────────┘
                     │ Cáp mạng Ethernet RJ45
                     ▼
         ┌────────────────────────┐
         │     MÁY TÍNH WINDOWS   │
         │   (Chạy HMI Server)    │
         │                        │
         │  LAN Card: 192.168.1.10│ <--- Nối PLC
         │  WiFi Card:192.168.1.100<--- Phát HMI Web
         └───────────┬────────────┘
                     │ Sóng WiFi cục bộ (Bộ phát Router/Access Point)
         ┌───────────┴────────────┐
         ▼                        ▼
  ┌──────────────┐         ┌──────────────┐
  │  Smartphone  │         │    Tablet    │
  │ 192.168.1.150│         │ 192.168.1.151│
  └──────────────┘         └──────────────┘
```

---

## 2. Tìm Địa Chỉ IP Của Máy Tính Windows

1. Bấm tổ hợp phím `Windows + R`, gõ `cmd` hoặc `powershell` và nhấn **Enter**.
2. Gõ lệnh:
   ```cmd
   ipconfig
   ```
3. Tìm đến card mạng đang kết nối WiFi (hoặc Ethernet LAN):
   ```
   Wireless LAN adapter Wi-Fi:
      IPv4 Address. . . . . . . . . . . : 192.168.1.100
      Subnet Mask . . . . . . . . . . . : 255.255.255.0
      Default Gateway . . . . . . . . . : 192.168.1.1
   ```
4. Địa chỉ IP máy tính ở ví dụ này là: `192.168.1.100`.

---

## 3. Cấu Hình Tường Lửa Windows (Windows Defender Firewall)

> [!IMPORTANT]
> **Tuyệt đối không tắt toàn bộ Windows Firewall** vì lý do an toàn mạng công nghiệp. Chỉ cần tạo một quy tắc (Inbound Rule) cho phép cổng **TCP 8080**.

### Cách 1: Chạy 1 dòng lệnh trong PowerShell (Run as Administrator)
Mở PowerShell bằng quyền Administrator và chạy lệnh:
```powershell
New-NetFirewallRule -DisplayName "Warehouse HMI Web Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Cách 2: Cấu hình thủ công qua giao diện đồ họa
1. Mở Start Menu, tìm kiếm **Windows Defender Firewall with Advanced Security**.
2. Chọn **Inbound Rules** ở cột bên trái -> bấm **New Rule...** ở cột bên phải.
3. Chọn **Port** -> bấm Next.
4. Chọn **TCP**, nhập cổng: `8080` -> bấm Next.
5. Chọn **Allow the connection** -> bấm Next.
6. Tích chọn **Domain**, **Private** (bỏ chọn Public nếu không cần) -> bấm Next.
7. Đặt tên: `Warehouse HMI Port 8080` -> bấm **Finish**.

---

## 4. Khởi Chạy Server Production Trên Windows

1. Chạy file script tự động:
   ```powershell
   .\scripts\run.ps1
   ```
   *Script sẽ tự động build frontend, compile Go ra file `warehouse-hmi.exe`, tự động dò tìm IP cục bộ và khởi chạy server.*

2. Mở trình duyệt trên máy tính Windows:
   ```
   http://localhost:8080
   ```

3. Mở trên điện thoại thông minh / Tablet (kết nối cùng WiFi):
   ```
   http://192.168.1.100:8080
   ```

---

## 5. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

- **Điện thoại báo "This site can't be reached"**:
  - Kiểm tra xem điện thoại và máy tính PC có đang kết nối chung 1 bộ phát WiFi không.
  - Một số router WiFi công cộng bật tính năng **"AP Isolation"** (ngăn các thiết bị WiFi nhìn thấy nhau). Cần tắt tính năng này trong cấu hình router hoặc sử dụng router công nghiệp riêng cho xưởng.
  - Kiểm tra lại quy tắc tường lửa cổng 8080 như ở Mục 3.
- **Server báo "PLC Connection Refused / Timeout"**:
  - Kiểm tra cáp mạng cắm vào PLC có sáng đèn LINK/ACT không.
  - Thử lệnh `ping 192.168.1.20` từ máy tính Windows để kiểm tra thông tuyến IP với PLC.
  - Đảm bảo PLC đã được bật tính năng Modbus TCP Server và không bị trùng Unit ID (mặc định Unit ID = 1).
