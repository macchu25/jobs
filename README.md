# Warehouse HMI - Hệ Thống Web HMI / PWA Phân Loại & Xuất Hàng Tự Động Với PLC

> **Hệ thống Web HMI / PWA chuẩn công nghiệp (Industrial Automation)** điều khiển dây chuyền phân loại và xuất hàng tự động với hai chế độ hoạt động: **Mô phỏng hoàn chỉnh (Simulation Mode)** và **Kết nối PLC thật (Real PLC Mode)**.

---

## 1. Kiến Trúc Tổng Quan Hệ Thống

```
                     ┌─────────────────┐
                     │   PLC THẬT      │
                     └────────┬────────┘
                              │ Modbus TCP / Fieldbus Driver
                              ▼
                    ┌───────────────────┐
                    │   PLCAdapter      │
                    ├───────────────────┤
                    │ MockPLCAdapter    │ <--- Simulation Engine
                    │ RealPLCAdapter    │ <--- Real Modbus Driver
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │   Go Backend      │
                    │                   │
                    │ REST API          │
                    │ WebSocket Hub     │
                    │ Alarm Engine      │
                    │ Inventory Service │
                    │ History Log       │
                    │ Command Engine    │
                    │ SQLite Database   │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │ React Web HMI PWA │
                    │ (Tailwind + TS)   │
                    └────────┬──────────┘
                             │ LAN / WiFi
                ┌────────────┴────────────┐
                ▼                         ▼
        PC / Máy Tính Bảng            Điện Thoại
```

---

## 2. Tính Năng Cốt Lõi

### Hai Chế Độ Hoạt Động (Dual-Mode):
1. **Simulation Mode (Mô phỏng)**:
   - Mô phỏng toàn bộ chu trình phân loại và xuất hàng có độ trễ vật lý (500–1500ms).
   - Mô phỏng cảm biến quang học infeed/outfeed, băng tải chạy, xylanh đẩy hàng, số lượng tồn kho từng ô.
   - Hỗ trợ kích hoạt kẹt hàng (JAM), mất kết nối PLC, ô đầy, tự động sinh hàng ngẫu nhiên.
2. **Real PLC Mode (PLC Thật)**:
   - Kết nối PLC thật qua **Modbus TCP Driver**.
   - Chu trình handshake công nghiệp: `Request bit -> PLC ACK/Busy -> Hardware Confirm -> Clear`.
   - Cơ chế bảo vệ **`ENABLE_REAL_PLC_WRITES=false`** mặc định: Cho phép đọc trạng thái nhưng khóa ghi phần cứng cho đến khi người dùng chủ động kích hoạt.
   - Cơ chế tự động kết nối lại (Auto Reconnect) với exponential backoff.

### PWA & An Toàn Vận Hành (Safety & Failsafe):
- **Full Screen Offline Overlay**: Khi điện thoại mất kết nối WiFi/Server, màn hình đỏ **"SERVER OFFLINE - Control commands disabled"** lập tức khóa toàn bộ nút điều khiển để ngăn chặn bấm nhầm dựa trên dữ liệu cũ.
- Service Worker chỉ cache tài nguyên tĩnh (HTML/CSS/JS/Icons); tuyệt đối **NetworkOnly** đối với API và WebSocket.
- Tuân thủ an toàn: Nút dừng khẩn cấp E-Stop trên Web là chỉ báo giám sát và không thay thế cho mạch E-Stop phần cứng.

---

## 3. Cấu Trúc Mã Nguồn

```
warehouse-hmi/
├── backend/
│   ├── cmd/server/main.go          # Entrypoint Go Server, graceful shutdown
│   ├── internal/
│   │   ├── api/                    # 20+ REST API endpoints & Web handlers
│   │   ├── plc/
│   │   │   ├── adapter.go          # PLCAdapter interface chuẩn
│   │   │   ├── mock/adapter.go     # MockPLCAdapter cầu nối simulation
│   │   │   ├── real/adapter.go     # RealPLCAdapter với handshake & write-lock
│   │   │   └── driver/modbus/      # Driver Modbus TCP thuần Go
│   │   ├── simulation/             # State machine mô phỏng dây chuyền
│   │   ├── machine/                # Quản lý trạng thái máy, interlocks
│   │   ├── inventory/              # Dịch vụ quản lý số lượng tồn kho
│   │   ├── command/                # Máy trạng thái lệnh, khóa chống trùng ô
│   │   ├── alarm/                  # Động cơ cảnh báo công nghiệp
│   │   ├── database/               # SQLite pure-Go (không cần CGO/GCC)
│   │   ├── websocket/              # WebSocket Hub, push snapshot & delta
│   │   └── config/                 # Parser .env & plc-map.yaml
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/             # Header, Sidebar, BottomNav, MachineFlowView, BinCard
│   │   ├── pages/                  # Dashboard, Bins, Manual, Alarms, History, Settings
│   │   ├── stores/                 # Zustand HMI State store
│   │   └── services/               # API & Resilient WebSocket client
│   ├── vite.config.ts              # Vite PWA cấu hình Service Worker
│   └── package.json
├── configs/
│   └── plc-map.yaml                # Cấu hình địa chỉ Coils, Registers PLC
├── scripts/
│   ├── dev.ps1                     # Khởi chạy môi trường Dev (Vite + Go)
│   ├── build.ps1                   # Build production ra warehouse-hmi.exe
│   └── run.ps1                     # Chạy production và hiển thị IP LAN
├── docs/
│   ├── PLC_INTEGRATION.md          # Tài liệu tích hợp PLC, handshake, driver mới
│   ├── PWA.md                      # Hướng dẫn cài PWA lên Android & iOS
│   └── DEPLOY_WINDOWS.md           # Hướng dẫn mở cổng Firewall & kết nối WiFi
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

---

## 4. Yêu Cầu Môi Trường

- **Hệ điều hành**: Windows 10 / 11, Windows Server (hoặc Linux/macOS).
- **Go**: Phiên bản 1.22+ (đã xác thực trên Go 1.26.2).
- **Node.js**: Phiên bản 18+ (đã xác thực trên Node 24.14.0, npm 11.9.0).

---

## 5. Hướng Dẫn Khởi Chạy Môi Trường Development

Mở PowerShell tại thư mục dự án và chạy:
```powershell
.\scripts\dev.ps1
```
Hoặc chạy riêng biệt 2 terminal:
- **Terminal 1 (Backend Go)**:
  ```powershell
  cd backend
  go run cmd/server/main.go
  ```
  Backend sẽ chạy tại: `http://localhost:8080`.
- **Terminal 2 (Frontend Vite)**:
  ```powershell
  cd frontend
  npm run dev
  ```
  Frontend sẽ chạy tại: `http://localhost:5173` (tự động proxy `/api` và `/ws` về port 8080).

---

## 6. Hướng Dẫn Build & Chạy Production Trên Windows

Chỉ cần chạy 1 lệnh tự động:
```powershell
.\scripts\build.ps1
```
Script sẽ build toàn bộ frontend, copy vào thư mục `release/dist`, biên dịch Go thành file thực thi duy nhất:
```
release/warehouse-hmi.exe
```

Để khởi chạy server:
```powershell
.\scripts\run.ps1
```
Server sẽ tự động lắng nghe trên mọi card mạng `0.0.0.0:8080` và in ra địa chỉ IP LAN để kết nối điện thoại.

---

## 7. Cách Truy Cập Từ Điện Thoại & Máy Tính Bảng Cùng Mạng WiFi

### Bước 1: Tìm IP máy tính Windows
Mở PowerShell gõ lệnh `ipconfig`. Tìm dòng:
```
IPv4 Address: 192.168.1.100
```

### Bước 2: Cấu hình Windows Firewall mở port 8080
Mở PowerShell với quyền **Administrator** và chạy:
```powershell
New-NetFirewallRule -DisplayName "Warehouse HMI Port 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Bước 3: Mở trên điện thoại
Kết nối điện thoại vào cùng mạng WiFi với máy tính và mở trình duyệt:
```
http://192.168.1.100:8080
```
*(Xem hướng dẫn chi tiết tại [docs/PWA.md](file:///c:/Users/NHU%20HUU/Downloads/plx/docs/PWA.md) để cài app lên màn hình chính điện thoại).*

---

## 8. Nơi Điều Chỉnh Cấu Hình PLC

### 1. Đổi IP và Cổng PLC
Mở file `.env`:
```ini
PLC_MODE=real
PLC_PROTOCOL=modbus_tcp
PLC_HOST=192.168.1.20
PLC_PORT=502
PLC_POLL_INTERVAL_MS=250
```

### 2. Cho Phép Ghi Cơ Cấu Chấp Hành Thật (Kích Hoạt Điều Khiển Vật Lý)
Mặc định `ENABLE_REAL_PLC_WRITES=false` để chống kích nhầm cơ cấu. Khi đã sẵn sàng vận hành máy thật:
```ini
ENABLE_REAL_PLC_WRITES=true
```

### 3. Điều Chỉnh Sơ Đồ Địa Chỉ PLC (Address Mapping)
Mở file `configs/plc-map.yaml` để map địa chỉ Coil và Register tương ứng với chương trình PLC của bạn:
- `machine.auto_mode`, `machine.running`, `machine.emergency_stop`
- `conveyor.running`, `conveyor.start_command`, `conveyor.stop_command`
- `sensors.input_sensor`, `sensors.output_sensor`
- `handshake.call_request`, `handshake.command_busy`, `handshake.command_done`
- Danh sách từng ô chứa `bins`: `A01`, `A02`, `A03`, `B01`, `B02`, `B03` (địa chỉ thanh ghi tồn kho, cảm biến quang, cuộn coil kích xylanh đẩy/thu).

---

## 9. Tích Hợp Với Model PLC Cụ Thể Trong Tương Lai

Nếu hệ thống của bạn sử dụng một model PLC chuyên dụng (Siemens S7-1200/1500, Mitsubishi FX5U/Q-Series, Omron, Rockwell Allen-Bradley, hoặc OPC-UA), bạn chỉ cần cung cấp các thông tin sau:
1. **Hãng sản xuất (PLC Manufacturer)**: ví dụ Siemens / Mitsubishi / Schneider.
2. **Model PLC**: ví dụ S7-1200 CPU 1214C.
3. **Giao thức truyền thông**: ví dụ Siemens S7 Protocol (cổng 102), Modbus TCP (cổng 502), hoặc OPC-UA.
4. **Địa chỉ IP và Rack/Slot**: ví dụ `192.168.1.20`, Rack 0, Slot 1.
5. **Bảng phân bổ địa chỉ (Memory/Tag Map)**: Danh sách bit và byte tương ứng (ví dụ `DB1.DBX0.0` cho lệnh gọi hàng, `MW100` cho tồn kho).

**Toàn bộ giao diện HMI, WebSocket, API và logic nghiệp vụ được giữ nguyên hoàn toàn**, chỉ cần bổ sung driver tương ứng theo tài liệu [docs/PLC_INTEGRATION.md](file:///c:/Users/NHU%20HUU/Downloads/plx/docs/PLC_INTEGRATION.md).
