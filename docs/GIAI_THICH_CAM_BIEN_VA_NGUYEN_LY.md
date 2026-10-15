# 👁️ GIẢI THÍCH CHI TIẾT VỀ HỆ THỐNG CẢM BIẾN (SENSORS) VÀ NGUYÊN LÝ HOẠT ĐỘNG TRÊN BĂNG TẢI PHÂN LOẠI

> **Tài liệu tham khảo kỹ thuật và vận hành dây chuyền phân loại tự động.**  
> Giải thích rõ ràng vai trò của cảm biến quang, cảm biến từ hành trình xylanh, sự phối hợp giữa Camera AI và cảm biến, cùng bảng phân bổ địa chỉ Modbus TCP / PLC.

---

## 📌 1. "Cảm Biến Nớ" Rốt Cuộc Là Gì?

Trong dây chuyền băng tải phân loại hàng hóa, **"Cảm biến nớ"** chủ yếu là **CẢM BIẾN QUANG HỌC (Photoelectric Sensor - hay còn gọi dân dã là MẮT THẦN)** và **CẢM BIẾN TỪ HÀNH TRÌNH (Reed Switch)**.

* **Cảm biến quang học:** Gồm mắt phát tia hồng ngoại/laser và mắt thu. Khi kiện hàng trôi ngang qua cắt đứt tia sáng, cảm biến lập tức đóng tiếp điểm điện và gửi tín hiệu logic `ON (1)` về cho PLC.
* **Cảm biến từ hành trình:** Gắn trực tiếp trên rãnh thân xylanh khí nén. Khi nam châm vĩnh cửu gắn trong piston chạy ngang qua, cảm biến nhận từ trường và báo trạng thái xylanh đang thụt về hết hay đã vươn ra hết.

---

## ❓ 2. Tại Sao Đã Có Camera AI Rồi Vẫn Bắt Buộc Phải Có Cảm Biến?

Đây là câu hỏi rất phổ biến khi kết hợp thị giác máy tính và cơ khí:

| Thiết Bị | Vai Trò Thực Tế | Khả Năng & Giới Hạn |
| :--- | :--- | :--- |
| **CAMERA AI (OpenCV)** | **ĐỌC DỮ LIỆU & QUYẾT ĐỊNH ĐÍCH ĐẾN** | Đọc mã QR Google Maps, nhận diện màu sắc vỏ hộp (Đỏ, Xanh, Vàng...) và ra quyết định kiện hàng này phải đi vào **Cửa số mấy (1 - 5)**. <br/>⚠️ **Hạn chế:** Camera chỉ đứng ở một vị trí đầu băng chuyền, nó không thể biết kiện hàng sau khi trôi đi thì đã tới đúng mép Cửa phân loại hay chưa. |
| **CẢM BIẾN (Mắt Thần)** | **CANH ĐÚNG THỜI ĐIỂM ĐỂ KÍCH HOẠT ĐẨY HÀNG** | Báo cho PLC chính xác **từng mili-giây** khoảnh khắc kiện hàng vừa chạm tới miệng Cửa. <br/>⚠️ **Nếu không có cảm biến:** PLC phải dùng bộ đếm thời gian (Timer). Nếu kiện hàng bị trượt nhẹ trên băng tải hoặc băng tải chạy không đều, xylanh sẽ gạt sớm hoặc gạt muộn $\rightarrow$ Đẩy hụt hoặc làm móp méo kiện hàng! |

> 💡 **Quy tắc vàng:**  
> **Camera chịu trách nhiệm "TRÍ TUỆ" (Biết kiện hàng này đi đâu), còn Cảm biến chịu trách nhiệm "THỜI KHẮC" (Biết đúng lúc hàng đến cửa để bảo PLC đẩy)!**

---

## 🗺️ 3. Sơ Đồ Bố Trí Cảm Biến Dọc Dây Chuyền Băng Tải

```text
       Kiện hàng vào
             │
             ▼
     ┌───────────────┐
     │ VÙNG ĐẦU VÀO  │ ──► [ CẢM BIẾN QUANG 1 - INFEED ] (Địa chỉ 10020)
     └───────┬───────┘     • Đếm tổng sản phẩm vào
             │             • Báo hiệu kích hoạt Camera chụp
             ▼
     ┌───────────────┐
     │  VÙNG CAMERA  │ ──► [ CAMERA AI 30 FPS ]
     └───────┬───────┘     • Quét mã QR Google Maps & phân tích màu HSV
             │             • Gửi mã đích: "Cửa 2" sang bộ nhớ PLC
             ▼
     ┌───────────────┐
     │    CỬA 1      │ ──► [ CẢM BIẾN CỬA 1 ] ──► [ XYLANH GẠT 1 ] ──► [ THÙNG 1 ]
     └───────┬───────┘     (Kiểm tra: Nếu là Cửa 1 thì gạt, không phải thì bỏ qua)
             ▼
     ┌───────────────┐
     │    CỬA 2      │ ──► [ CẢM BIẾN CỬA 2 ] ──► [ XYLANH GẠT 2 ] ──► [ THÙNG 2 ]
     └───────┬───────┘     (Đúng Cửa 2 -> Cảm biến cắt tia -> Xylanh đẩy cái BỤP!)
             ▼
     ┌───────────────┐
     │    CỬA 3      │ ──► [ CẢM BIẾN CỬA 3 ] ──► [ XYLANH GẠT 3 ] ──► [ THÙNG 3 ]
     └───────┬───────┘
             ▼
     ┌───────────────┐
     │    CỬA 4      │ ──► [ CẢM BIẾN CỬA 4 ] ──► [ XYLANH GẠT 4 ] ──► [ THÙNG 4 ]
     └───────┬───────┘
             ▼
     ┌───────────────┐
     │    CỬA 5      │ ──► [ CẢM BIẾN CỬA 5 ] ──► [ XYLANH GẠT 5 ] ──► [ THÙNG 5 ]
     └───────┬───────┘
             ▼
     ┌───────────────┐
     │ CỬA LOẠI CUỐI │ ──► [ CẢM BIẾN OUTFEED / REJECT ] (Địa chỉ 10021 / 10039)
     └───────────────┘     • Bắt những kiện hàng lỗi, rách tem hoặc không đọc được QR
```

---

## ⚙️ 4. Chi Tiết Từng Vị Trí Cảm Biến Trong Hệ Thống

### 1. Cảm Biến Cửa Vào (Infeed Sensor - Modbus `10020` / PLC `X0`)
* **Vị trí:** Ngay đầu băng chuyền, nơi người vận hành hoặc máy cấp phôi đặt kiện hàng lên.
* **Chức năng:**
  1. Tăng bộ đếm **"Tổng Sản Phẩm Đã Nhập Dây Chuyền"**.
  2. Kích hoạt Camera: Khi có kiện hàng đi ngang qua cắt tia, cảm biến mới báo Camera chụp/quét $\rightarrow$ Tránh việc máy tính phải xử lý camera 24/7 khi băng tải không có hàng.

### 2. Cảm Biến Tại Từng Cửa Phân Loại (Gate Sensors 1 đến 5 - Modbus `10031` $\rightarrow$ `10035` / PLC `X1` $\rightarrow$ `X5`)
* **Vị trí:** Gắn ở thành băng tải, cách cần gạt xylanh một khoảng vừa đủ (khoảng 2–5 cm).
* **Chức năng:**
  * Khi kiện hàng trôi đến Cửa $N$, cảm biến tại Cửa $N$ bị che khuất tia sáng.
  * PLC kiểm tra: *"Gói hàng hiện tại có phải được chỉ định vào Cửa $N$ không?"*
    * **Nếu ĐÚNG:** PLC xuất điện áp 24V kích cuộn hút van khí nén $\rightarrow$ Xylanh phóng ra gạt kiện hàng rơi vào khay/thùng Cửa $N$.
    * **Nếu SAI:** PLC giữ xylanh đứng im $\rightarrow$ Kiện hàng tiếp tục trôi thẳng sang các cửa tiếp theo.

### 3. Cảm Biến Hành Trình Xylanh Khí Nén (Pusher Reed Switches - Modbus `10061` $\rightarrow$ `10065`)
* **Vị trí:** Gắn trên thân ống xylanh.
* **Chức năng bảo vệ an toàn (Failsafe):**
  * Báo cho PLC biết xylanh đã **đẩy hết tầm** (đảm bảo kiện hàng đã rơi hẳn vào thùng).
  * Báo cho PLC biết xylanh đã **thu về hết vị trí nghỉ** (không chìa tay gạt ra giữa băng tải làm kẹt các kiện hàng chạy phía sau).
  * Nếu xuất lệnh đẩy mà sau 1.5 giây cảm biến không báo vươn hết tầm $\rightarrow$ Hệ thống Web HMI lập tức kích hoạt cảnh báo **"KẸT XYLANH HOẶC MẤT ÁP KHÍ NÉN!"**.

### 4. Cảm Biến Cuối Băng Tải (Outfeed / Reject Sensor - Modbus `10021` / `10039`)
* **Vị trí:** Điểm cuối cùng của băng tải.
* **Chức năng:**
  * Bắt tất cả các kiện hàng không thuộc Cửa 1–5 (tem QR bị rách, nhòe mực, hoặc sai định dạng).
  * Đẩy kiện hàng vào thùng phế phẩm / hàng cần kiểm tra lại (Reject Bin).

---

## 📊 5. Bảng Ánh Xạ Địa Chỉ Modbus TCP Trong Dự Án (`configs/plc-map.yaml`)

| Tên Cảm Biến / Cơ Cấu | Mã Ký Hiệu | Địa Chỉ Modbus | Kiểu Dữ Liệu | Chức Năng |
| :--- | :---: | :---: | :---: | :--- |
| **Cảm biến Đầu vào (Infeed)** | `s_infeed` | `10020` | Discrete Input (Bit) | Phát hiện kiện hàng mới vào băng chuyền |
| **Cảm biến Đầu ra (Outfeed)** | `s_outfeed` | `10021` | Discrete Input (Bit) | Phát hiện hàng trôi tới cuối băng tải |
| **Cảm biến Cửa 1 (Hải Châu)** | `s_gate_1` | `10031` | Discrete Input (Bit) | Canh vị trí gạt kiện hàng Cửa 1 |
| **Cảm biến Cửa 2 (Thanh Khê)** | `s_gate_2` | `10032` | Discrete Input (Bit) | Canh vị trí gạt kiện hàng Cửa 2 |
| **Cảm biến Cửa 3 (Liên Chiểu)** | `s_gate_3` | `10033` | Discrete Input (Bit) | Canh vị trí gạt kiện hàng Cửa 3 |
| **Cảm biến Cửa 4 (Ngũ Hành Sơn)**| `s_gate_4` | `10034` | Discrete Input (Bit) | Canh vị trí gạt kiện hàng Cửa 4 |
| **Cảm biến Cửa 5 (Cẩm Lệ)** | `s_gate_5` | `10035` | Discrete Input (Bit) | Canh vị trí gạt kiện hàng Cửa 5 |
| **Cảm biến Cửa Loại (Reject)** | `s_reject` | `10039` | Discrete Input (Bit) | Canh vị trí gạt hàng lỗi vào thùng Reject |
| **Cảm biến Từ Xylanh 1 $\rightarrow$ 5** | `s_pusher_1..5`| `10061` $\rightarrow$ `10065` | Discrete Input (Bit) | Báo trạng thái vươn/thu của cần gạt khí nén |
| **Cuộn Hút Xylanh 1 $\rightarrow$ 5** | `y_pusher_1..5`| `111` $\rightarrow$ `115` | Coil (Bit R/W) | Lệnh xuất điện áp bật van điện từ gạt hàng |
| **Thanh Ghi Tín Hiệu Camera** | `reg_camera` | `40001` (Reg 0) | Holding Register (Word)| Camera ghi mã Cửa (1, 2, 3, 4, 5, 99) vào đây |

---

## 📝 6. Hướng Dẫn Tối Nay Trao Đổi Với Đồng Đội / Kỹ Sư PLC

Khi đồng đội giải thích thêm về phần cảm biến, bạn chỉ cần hỏi và xác nhận các câu hỏi sau:

1. **Vị trí lắp đặt thực tế:**
   * Dây chuyền thực tế có gắn cảm biến quang tại từng Cửa không, hay chỉ dùng 1 cảm biến ở đầu vào rồi đếm Timer / Encoder?
2. **Loại cảm biến sử dụng:**
   * Cảm biến quang loại NPN (xuất mức 0V) hay PNP (xuất mức 24V)?
   * Thường mở (NO - Normally Open) hay thường đóng (NC)?
3. **Cổng đấu dây trên PLC:**
   * Cảm biến Infeed nối vào chân `X...?`
   * Cảm biến Cửa 1..5 nối vào chân `X...?`
4. **Logic điều khiển mong muốn:**
   * Chiều PLC $\rightarrow$ Camera: Cảm biến có cần gửi tín hiệu bảo Camera chụp hình không?
   * Chiều Camera $\rightarrow$ PLC: Camera chỉ ghi số `1..5` vào thanh ghi, phần còn lại (chờ cảm biến tới cửa rồi bật van gạt) do PLC tự động hoàn toàn?

Mọi cấu hình trên đều đã được thiết kế mở trong dự án, chỉ cần thay đổi số địa chỉ trong [`configs/plc-map.yaml`](file:///c:/Users/NHU%20HUU/Downloads/plx/configs/plc-map.yaml) là hệ thống tự động khớp mà không cần sửa lại code giao diện!
