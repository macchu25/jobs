# 🏭 Warehouse Sorting & Dispensing HMI

> **Hệ Thống Phân Loại Hàng Hóa Tự Động Kết Hợp Thị Giác Máy Tính (OpenCV AI Vision), Mô Phỏng Dây Chuyền Băng Tải Digital Twin 60 FPS & Điều Khiển Phần Cứng PLC Modbus TCP.**

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.x-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Modbus TCP](https://img.shields.io/badge/Protocol-Modbus%20TCP-FF6F00)](https://modbus.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

---

## 📑 Mục Lục
1. [Giới Thiệu Tổng Quan](#1-giới-thiệu-tổng-quan)
2. [Tính Năng Nổi Bật](#2-tính-năng-nổi-bật)
3. [Kiến Trúc Hệ Thống (System Architecture)](#3-kiến-trúc-hệ-thống)
4. [Hướng Dẫn Khởi Động Nhanh (1 Click)](#4-hướng-dẫn-khởi-động-nhanh)
5. [Hệ Thống Mã QR Đa Tầng (Dual-Mode QR)](#5-hệ-thống-mã-qr-đa-tầng)
6. [Bảng Phân Bổ Địa Chỉ PLC Modbus (Memory Map)](#6-bảng-phân-bổ-địa-chỉ-plc-modbus)
7. [Cấu Trúc Thư Mục Dự Án](#7-cấu-trúc-thư-mục-dự-án)
8. [Cấu Hình & Tinh Chỉnh Hệ Thống](#8-cấu-hình--tinh-chỉnh)
9. [Triển Khai Mạng LAN & Thiết Bị Di Động](#9-triển-khai-mạng-lan--thiết-bị-di-động)

---

## 1. Giới Thiệu Tổng Quan

Dự án cung cấp giải pháp toàn diện cho dây chuyền phân loại bưu phẩm, đơn hàng và kiện hàng tự động:
* **Lõi Xử Lý Thị Giác Máy Tính (Python + OpenCV)**: Nhận diện mã QR Google Maps và màu sắc vật thể với tốc độ cao (30 FPS, độ trễ < 15ms), lọc khử chói CLAHE và loại trừ da người.
* **Giao Diện Điều Khiển Web HMI & SCADA Hiện Đại**: Xây dựng trên React, TypeScript và TailwindCSS theo phong cách Vault Industrial, tương thích 100% trên PC, máy tính bảng và smartphone (PWA).
* **Mô Phỏng Song Song (Digital Twin Dual-View)**: Hiển thị đồng thời **Camera AI** và **Băng Chuyền Mô Phỏng 60 FPS**. Ngay khi camera phát hiện mã QR, kiện hàng có dán đúng mã QR đó lập tức xuất hiện trên băng chuyền ảo, di chuyển đến đúng Cửa và kích hoạt cần gạt xylanh khí nén!
* **Kết Nối PLC Công Nghiệp**: Hỗ trợ chuẩn Modbus TCP kết nối trực tiếp với các dòng PLC (Siemens, Mitsubishi, Delta, Schneider, Omron...) kèm theo bộ giả lập **PLC Simulator tích hợp sẵn** giúp chạy thử nghiệm ngay mà không cần phần cứng.

---

## 2. Tính Năng Nổi Bật

### 🎥 A. Song Song Digital Twin (Dual-View Workspace)
* **Bên 1 - Camera AI**:
  * Đa nguồn phát: **Webcam Máy Tính**, **Camera Ảo Test** (tự động giả lập đưa mẫu QR vào quét), **Luồng Python OpenCV** và **Tải File Ảnh/Video**.
  * Khung ngắm công nghiệp **ROI (Region Of Interest)** tự động vẽ bounding box quang học màu xanh quanh mã QR khi phát hiện.
  * Âm thanh phản hồi quét chuẩn mã vạch công nghiệp (Beep sound).
* **Bên 2 - Băng Chuyền Mô Phỏng (Digital Twin Conveyor 60 FPS)**:
  * Thể hiện trọn vẹn kết cấu dây chuyền: Con lăn cơ khí, đầu quét cảm biến, 5 cửa phân loại (Cửa 1: Hải Châu, Cửa 2: Thanh Khê, Cửa 3: Liên Chiểu, Cửa 4: Ngũ Hành Sơn, Cửa 5: Cẩm Lệ) và Cửa Loại Reject (Sig 99).
  * **Kiện hàng mang đúng hình ảnh mã QR vừa quét**: Chạy trên băng tải, xylanh cơ khí tự động vươn ra gạt kiện hàng vào thùng, đèn LED chớp sáng và gửi tín hiệu Modbus PLC tức thì.
  * Tích hợp sẵn 6 nút bấm thử quét nhanh 1-chạm (`Cửa 1` $\rightarrow$ `Cửa 5` & `Reject`) để thử nghiệm phản ứng của băng chuyền mà không cần đưa vật thể trước camera.

### 🖨️ B. Tạo & In Tem Mã QR Toàn Quốc (63 Tỉnh Thành)
* **Định Dạng Dual-Purpose**:
  * **Quét bằng Camera / Băng chuyền**: Nhận diện chuỗi cấu trúc và kích hoạt Cửa PLC tương ứng (VD: `CỬA 1 [DISTRICT_HAI_CHAU]`).
  * **Quét bằng Điện Thoại**: Tự động mở Google Maps dẫn đường chính xác tới số nhà, tên đường.
* **Bộ Mẫu Sẵn & Tự Nhập**:
  * 25 mẫu tem đại diện cho các quận/huyện 3 miền Bắc - Trung - Nam.
  * Chế độ **Tự Nhập 63 Tỉnh Thành**: Chọn bất kỳ tỉnh thành nào của Việt Nam, nhập số nhà / tên đường, gán Cửa Kích Hoạt PLC (Gate ID 1 - 99).
  * Xem trước tem decal và hỗ trợ tải ảnh PNG chất lượng cao hoặc in hàng loạt.

### 🏭 C. Kết Nối PLC Linh Hoạt & An Toàn
* Đổi địa chỉ IP, Cổng (Port), Slave ID, thanh ghi ghi tín hiệu trực tiếp trên giao diện Web mà không cần khởi động lại server.
* Tích hợp sẵn **PLC Simulator** (mặc định Port 503) tự động phản hồi thanh ghi và giả lập cảm biến.
* Khóa an toàn phần cứng: Cho phép bật/tắt quyền ghi cơ cấu chấp hành thật để tránh kích hoạt nhầm khi bảo trì.

---

## 3. Kiến Trúc Hệ Thống

```
                                ┌─────────────────────────────────────────┐
                                │          WEBCAM / CAMERA CÔNG NGHIỆP    │
                                └────────────────────┬────────────────────┘
                                                     │ Video Frames (30 FPS)
                                                     ▼
┌──────────────────┐    Modbus TCP     ┌─────────────────────────────────────────┐
│     PLC THẬT     │◄─────────────────►│         PYTHON AI VISION ENGINE         │
│(Siemens/Mitsubi) │  Holding Reg /    │ • OpenCV ROI & QR Scanner (jsQR/pyzbar) │
├──────────────────┤  Discrete Inputs  │ • Phân loại màu sắc HSV                 │
│  PLC SIMULATOR   │                   │ • Cầu nối WebBridge (FastAPI/WebSocket) │
│  (Port 503 built)│                   └────────────────────┬────────────────────┘
└──────────────────┘                                        │ REST API & WS Event Push
                                                            │ (Port 8080)
                                                            ▼
                                       ┌─────────────────────────────────────────┐
                                       │            WEB HMI DASHBOARD            │
                                       │ • Dual-View Digital Twin (Camera + Belt)│
                                       │ • Điều khiển & Giám sát trạng thái Cửa  │
                                       │ • Tạo & In tem QR Decal 63 tỉnh thành   │
                                       │ • Đa ngôn ngữ (Tiếng Việt / English)    │
                                       └────────────────────┬────────────────────┘
                                                            │ LAN / Wi-Fi
                                     ┌──────────────────────┴──────────────────────┐
                                     ▼                                             ▼
                             Laptop / PC Giám Sát                          Smartphone / Tablet PWA
```

---

## 4. Hướng Dẫn Khởi Động Nhanh

### Cách 1: Khởi Động 1-Click (Khuyên Dùng)
Chỉ cần click đúp vào file kịch bản tự động tại thư mục gốc:
* **[`start.bat`](start.bat)** hoặc **[`run_full_system.bat`](run_full_system.bat)**

Hệ thống sẽ tự động:
1. Khởi động Python Backend, OpenCV Vision và PLC Simulator tại `http://localhost:8080`.
2. Khởi động Web HMI Frontend tại `http://localhost:5173`.
3. Tự động mở trình duyệt web lên màn hình làm việc.

---

### Cách 2: Khởi Chạy Song Song (Giao Diện Desktop PyQt5 + Web HMI)
Dành cho trường hợp bạn vừa muốn xem cửa sổ phần mềm PyQt5 truyền thống, vừa muốn mở Web HMI trên trình duyệt/điện thoại:
1. Mở **[`run_python_app.bat`](run_python_app.bat)**: Mở giao diện Desktop PyQt5 và bật WebBridge.
2. Mở **[`run_web.bat`](run_web.bat)**: Mở giao diện Web HMI tại `http://localhost:5173`.

---

### Cách 3: Chạy Từng Phần Bằng Lệnh (Developer Mode)

#### 1. Yêu Cầu Cài Đặt:
* **Python**: 3.10 trở lên.
* **Node.js**: 18 trở lên.

#### 2. Cài Đặt Thư Viện Python:
```bash
cd temp_clone
pip install -r requirements.txt
```

#### 3. Chạy Python Backend (Headless Mode):
```bash
python run_headless.py
```

#### 4. Cài Đặt & Chạy Web Frontend:
```bash
cd frontend
npm install
npm run dev
```
Truy cập giao diện tại: `http://localhost:5173`.

---

## 5. Hệ Thống Mã QR Đa Tầng

Mỗi mã QR được tạo từ menu **Tạo Tem Mã QR** mang định dạng URL có gắn neo dữ liệu (Hash Anchor):
```text
https://maps.google.com/?q=123+Bach+Dang+Da+Nang#DISTRICT_HAI_CHAU
```

| Thiết Bị Quét | Kết Quả Xử Lý |
| :--- | :--- |
| **Điện Thoại Di Động** | Trình quét camera mở trực tiếp ứng dụng Google Maps dẫn đường tới `123 Bạch Đằng, Đà Nẵng`. |
| **Camera AI / Băng Chuyền** | Hệ thống bóc tách chuỗi `#DISTRICT_HAI_CHAU`, so khớp Quy tắc và kích hoạt **Cửa 1** trên PLC. |

---

## 6. Bảng Phân Bổ Địa Chỉ PLC Modbus

### 1. Bảng Phân Loại Cửa & Mã Tín Hiệu:
| Cửa Phân Loại | Khu Vực / Tên | Màu Sắc | Từ Khóa QR | Tín Hiệu Ghi PLC (Register 0) |
| :---: | :--- | :---: | :--- | :---: |
| **Cửa 1** | Quận Hải Châu | Đỏ (`#FF3B30`) | `HAI_CHAU` | `1` |
| **Cửa 2** | Quận Thanh Khê | Xanh lá (`#34C759`) | `THANH_KHE` | `2` |
| **Cửa 3** | Quận Liên Chiểu | Xanh dương (`#007AFF`) | `LIEN_CHIEU` | `3` |
| **Cửa 4** | Quận Ngũ Hành Sơn | Cam (`#FF9500`) | `NGU_HANH_SON` | `4` |
| **Cửa 5** | Quận Cẩm Lệ | Tím (`#AF52DE`) | `CAM_LE` | `5` |
| **Cửa Loại** | Hàng Lỗi / Không QR | Đỏ Cảnh Báo (`#FF453A`) | `NONE` | `99` |

### 2. Sơ Đồ Địa Chỉ Cảm Biến & Xylanh Công Nghiệp (`configs/plc-map.yaml`):
* `10020` (Discrete Input): Cảm biến quang cửa vào (Infeed Entry Sensor).
* `10021` (Discrete Input): Cảm biến quang tại vị trí Camera quét.
* `10031` $\rightarrow$ `10035` (Discrete Input): Cảm biến quang phát hiện kiện hàng tại từng Cửa 1 $\rightarrow$ Cửa 5.
* `10061` $\rightarrow$ `10065` (Discrete Input): Cảm biến từ hành trình xylanh đẩy tại từng Cửa.
* `111` $\rightarrow$ `115` (Coil): Cuộn hút van điện từ kích hoạt xylanh gạt Cửa 1 $\rightarrow$ Cửa 5.
* `40001` $\rightarrow$ `40005` (Holding Register): Bộ đếm số lượng kiện hàng thực tế trong từng khay/thùng.

> 📖 **Xem tài liệu giải thích chi tiết vai trò mắt thần, nguyên lý hoạt động & kết nối PLC tại:** [docs/GIAI_THICH_CAM_BIEN_VA_NGUYEN_LY.md](docs/GIAI_THICH_CAM_BIEN_VA_NGUYEN_LY.md)

---

## 7. Cấu Trúc Thư Mục Dự Án

```text
plx/
├── start.bat                   # Kịch bản khởi động 1-click toàn bộ hệ thống
├── run_full_system.bat         # Khởi động Python Backend + Web Frontend
├── run_python_headless.bat     # Chạy ngầm Python Backend (không mở cửa sổ)
├── run_python_app.bat          # Chạy Python Desktop PyQt5 gốc
├── run_web.bat                 # Chạy dev server Web HMI
├── configs/
│   └── plc-map.yaml            # Bảng ánh xạ địa chỉ PLC Modbus TCP chuẩn
├── frontend/                   # Ứng dụng Web HMI React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/         # Các linh kiện giao diện (Dual-View, Bins, Charts)
│   │   ├── pages/              # Trang Dashboard, Vision AI, Bins, Manual, QR, Settings
│   │   ├── stores/             # Quản lý trạng thái ứng dụng (Zustand)
│   │   ├── utils/              # Bộ phân loại thị giác máy tính & mã QR
│   │   └── i18n/               # Từ điển đa ngôn ngữ (Tiếng Việt & English)
│   └── vite.config.ts          # Cấu hình Vite & PWA Service Worker
└── temp_clone/                 # Mã nguồn Python Core & OpenCV AI Vision
    ├── main.py                 # Điểm chạy ứng dụng Desktop PyQt5 gốc
    ├── run_headless.py         # Điểm chạy chế độ Headless Server
    ├── config.json             # Cấu hình ngưỡng màu HSV, IP PLC và Quy tắc
    ├── requirements.txt        # Danh sách gói thư viện Python (opencv, pymodbus, fastapi)
    └── src/
        ├── plc/                # Modbus Client & Bộ giả lập PLCSimulator
        ├── server/             # WebBridge (FastAPI, MJPEG stream, WebSocket)
        ├── ui/                 # Giao diện cửa sổ Desktop PyQt5
        └── vision/             # Camera thread, thuật toán QR & màu sắc
```

---

## 8. Cấu Hình & Tinh Chỉnh

### 1. Cấu hình PLC & Ngưỡng Màu trong `temp_clone/config.json`:
```json
{
  "plc": {
    "ip": "192.168.0.1",
    "port": 503,
    "slave_id": 1,
    "register_address": 0,
    "simulation_mode": true
  },
  "camera": {
    "device_index": 0,
    "width": 1280,
    "height": 720,
    "fps": 30
  }
}
```
*Bạn có thể chỉnh sửa trực tiếp các thông số này ngay trên menu **Cấu Hình & Cài Đặt** của Web HMI mà không cần mở file code.*

---

## 9. Triển Khai Mạng LAN & Thiết Bị Di Động

1. **Tìm địa chỉ IP máy tính**: Mở Terminal gõ `ipconfig` (tìm dòng `IPv4 Address: 192.168.x.x`).
2. **Mở cổng Windows Firewall (nếu cần)**: Cho phép truy cập cổng `5173` (Frontend) và `8080` (Backend).
3. **Mở trên điện thoại/máy tính bảng**: Mở trình duyệt và truy cập:
   ```text
   http://192.168.x.x:5173
   ```
4. **Cài đặt dạng ứng dụng (PWA)**: Nhấn biểu tượng *"Thêm vào Màn hình chính"* trên Chrome hoặc Safari để sử dụng toàn màn hình như ứng dụng native.

---

## 📜 Giấy Phép & Bản Quyền
Dự án được phân phối dưới giấy phép **MIT License**. Mọi quyền được bảo lưu.
