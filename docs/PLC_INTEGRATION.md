# Hướng Dẫn Tích Hợp & Cấu Hình PLC Thật (Industrial PLC Integration Guide)

Tài liệu này giải thích chi tiết kiến trúc tầng điều khiển, giao thức truyền thông công nghiệp, sơ đồ địa chỉ và cơ chế an toàn khi kết nối Web HMI với PLC vật lý.

---

## 1. Kiến Trúc Tầng PLC Adapter

Toàn bộ logic nghiệp vụ (Inventory, Command Engine, Alarm Engine) tuyệt đối không giao tiếp trực tiếp với phần cứng mà thông qua giao diện chuẩn **`PLCAdapter`**:

```
                  ┌───────────────────────────────┐
                  │    Business Core (Go Backend) │
                  └──────────────┬────────────────┘
                                 │ PLCAdapter Interface
                                 ▼
                 ┌────────────────────────────────┐
                 │       RealPLCAdapter           │
                 ├────────────────────────────────┤
                 │ - Write Safety Interlock       │
                 │ - Industrial Handshake State   │
                 │ - Cyclic Polling Service       │
                 │ - Reconnect Manager            │
                 └───────────────┬────────────────┘
                                 │ PLCDriver Interface
                                 ▼
                 ┌────────────────────────────────┐
                 │       ModbusTCPDriver          │
                 │ (Extensible: S7 / MC / OPC-UA) │
                 └───────────────┬────────────────┘
                                 │ Ethernet / Fieldbus
                                 ▼
                 ┌────────────────────────────────┐
                 │      PLC Vật Lý (Modbus TCP)   │
                 └────────────────────────────────┘
```

---

## 2. Giao Thức Mẫu: Modbus TCP

Hệ thống cung cấp sẵn driver **Modbus TCP Driver** chuẩn công nghiệp:
- **Coil (0xxxx)**: Bit đọc/ghi (Lệnh gọi hàng, chạy/dừng băng tải, đẩy/thu xylanh).
- **Discrete Input (1xxxx)**: Bit chỉ đọc (Sensor quang học infeed/outfeed, sensor hành trình, trạng thái máy, E-Stop).
- **Input Register (3xxxx)**: Thanh ghi 16-bit chỉ đọc (Mã lỗi PLC, dữ liệu cảm biến đo).
- **Holding Register (4xxxx)**: Thanh ghi 16-bit đọc/ghi (Số lượng tồn kho từng ô, mã số ô gọi).

---

## 3. Sơ Đồ Ánh Xạ Địa Chỉ (`configs/plc-map.yaml`)

Tất cả địa chỉ được tách riêng ra file `configs/plc-map.yaml` và không bao giờ bị hardcode:

```yaml
protocol: modbus_tcp
version: "1.0"

machine:
  auto_mode:
    type: discrete_input
    address: 10001
  running:
    type: discrete_input
    address: 10002
  emergency_stop:
    type: discrete_input
    address: 10003

conveyor:
  running:
    type: discrete_input
    address: 10010
  start_command:
    type: coil
    address: 10
  stop_command:
    type: coil
    address: 11

sensors:
  input_sensor:
    type: discrete_input
    address: 10020
  output_sensor:
    type: discrete_input
    address: 10021

handshake:
  call_request:
    type: coil
    address: 50
  call_bin_code:
    type: holding_register
    address: 40100
  command_busy:
    type: discrete_input
    address: 10050
  command_done:
    type: discrete_input
    address: 10051
  command_error:
    type: discrete_input
    address: 10052
  command_error_code:
    type: input_register
    address: 30050

bins:
  - id: "A01"
    name: "Bin A01"
    product_code: "PRODUCT_A"
    capacity: 20
    bin_numeric_code: 101
    quantity:
      type: holding_register
      address: 40001
    sensor:
      type: discrete_input
      address: 10031
    call_command:
      type: coil
      address: 101
    pusher_extend:
      type: coil
      address: 111
    pusher_retract:
      type: coil
      address: 121
    pusher_extended_sensor:
      type: discrete_input
      address: 10061
```

---

## 4. Chu Trình Handshake Xuất Hàng (Command Handshake)

Khi người vận hành bấm **CALL ITEM A01**, backend thực hiện chu trình handshake chuẩn công nghiệp để chống mất lệnh hoặc kẹt cơ cấu:

```
Web HMI              Go Backend             PLC Vật Lý
   │                      │                     │
   │─── POST /bins/A01/call ──>                 │
   │                      │ Ghi bin_code=101    │
   │                      │────────────────────>│
   │                      │ Strobe call_request │
   │                      │────────────────────>│
   │                      │                     │ (PLC nhận lệnh)
   │                      │                     │ Bật command_busy=1
   │                      │<────────────────────│
   │                      │ Xóa call_request=0  │
   │                      │────────────────────>│
   │                      │                     │ (Băng tải chạy,
   │                      │                     │  Xylanh A01 đẩy hàng,
   │                      │                     │  Sensor outfeed xác nhận)
   │                      │                     │ Bật command_done=1
   │                      │<────────────────────│
   │                      │ Giảm quantity -1    │
   │<── WS bin_updated ───│ Ghi log & Audit     │
```

Nếu trong vòng `COMMAND_ACK_TIMEOUT_MS` (mặc định 3000ms) PLC không phản hồi `command_busy`, hoặc quá `COMMAND_EXECUTION_TIMEOUT_MS` (mặc định 15000ms) không báo `command_done`:
- Command chuyển trạng thái **`FAILED`**.
- Phát sinh cảnh báo công nghiệp **`OUTPUT_SENSOR_TIMEOUT`**.
- **Tuyệt đối không giảm số lượng tồn kho** nếu hàng chưa thực sự đi ra cảm biến.

---

## 5. Khóa An Toàn Khi Commissioning (`ENABLE_REAL_PLC_WRITES`)

Trong file `.env`:
```ini
PLC_MODE=real
ENABLE_REAL_PLC_WRITES=false
```
- Khi `ENABLE_REAL_PLC_WRITES=false`: Backend được phép kết nối và đọc trạng thái PLC, sensor và hiển thị lên Web HMI, nhưng **mọi lệnh ghi cơ cấu chấp hành đều bị khóa cứng tại backend**. Giao diện hiển thị nhãn **`READ ONLY / REAL PLC WRITE LOCKED`**.
- Chỉ khi kỹ sư kiểm tra hệ thống cơ khí an toàn và chuyển `ENABLE_REAL_PLC_WRITES=true`, các nút điều khiển mới thực sự ghi xung xuống cuộn coil của PLC.

---

## 6. Cơ Chế Tự Động Kết Nối Lại (Auto Reconnect)

- Polling định kỳ theo `PLC_POLL_INTERVAL_MS` (200–500ms).
- Nếu đứt cáp mạng hoặc tắt nguồn PLC:
  - Backend không bao giờ crash.
  - Tự động kích hoạt cơ chế backoff (1s, 2s, 5s, tối đa 10s).
  - Bắn sự kiện WebSocket `plc_status` = `DISCONNECTED` làm giao diện đỏ và vô hiệu hóa nút bấm.
  - Tự động xóa cảnh báo `PLC_DISCONNECTED` khi đường truyền được khôi phục.

---

## 7. Cách Thêm Driver Mới (Siemens S7, Mitsubishi MC, OPC-UA)

Hệ thống được thiết kế theo Interface Segregation:
1. Tạo package trong `backend/internal/plc/driver/<protocol>/driver.go`.
2. Triển khai interface:
   ```go
   type PLCDriver interface {
       Connect(ctx context.Context) error
       Close() error
       IsConnected() bool
       ReadCoil(address uint16) (bool, error)
       ReadDiscreteInput(address uint16) (bool, error)
       ReadHoldingRegister(address uint16) (uint16, error)
       ReadInputRegister(address uint16) (uint16, error)
       WriteSingleCoil(address uint16, value bool) error
       WriteSingleRegister(address uint16, value uint16) error
   }
   ```
3. Khai báo trong `backend/cmd/server/main.go` dựa trên `cfg.PLCProtocol`.
