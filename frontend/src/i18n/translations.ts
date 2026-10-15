export type Language = 'vi' | 'en';

const rawTranslations = {
  vi: {
    // Navigation / Sidebar
    nav: {
      dashboard: 'Tổng Quan Kho',
      visionAi: 'Camera AI & Vision',
      inventory: 'Quản Lý Cửa & Kho',
      manualPlc: 'Điều Khiển PLC',
      alarms: 'Trung Tâm Cảnh Báo',
      history: 'Lịch Sử & Báo Cáo',
      qrGen: 'Tạo Tem Mã QR',
      settings: 'Cài Đặt Hệ Thống',
      online: 'Trực Tuyến',
      offline: 'Mất Kết Nối',
      systemActive: 'Hệ Thống Sẵn Sàng',
    },

    // Header
    header: {
      industrialPlc: 'PLC Công Nghiệp',
      live: 'LIVE',
      wsOffline: 'MẤT KẾT NỐI WS',
      plcConnected: 'PLC: ĐÃ KẾT NỐI',
      plcDisconnected: 'PLC: NGẮT KẾT NỐI',
      searchPlaceholder: 'Tìm kiếm cửa, mã tem, quy tắc...',
      filter: 'Bộ lọc',
      alarms: 'Cảnh báo',
      printQr5Districts: '+ In Tem QR 5 Quận',
      eStopActive: 'E-STOP ACTIVE - DÂY CHUYỀN ĐANG KHÓA AN TOÀN VẬT LÝ',
      titles: {
        dashboard: 'Quản Lý Kho & Phân Loại',
        vision: 'Camera AI & Thị Giác Máy',
        bins: 'Danh Sách Cửa Phân Loại',
        manual: 'Điều Khiển Thủ Công PLC',
        alarms: 'Cảnh Báo & Sự Cố',
        history: 'Lịch Sử Phân Loại',
        qr: 'Tạo Tem Nhãn Mã QR',
        settings: 'Cài Đặt Hệ Thống',
      },
    },

    // Dashboard Stat Cards
    stats: {
      totalOrders: 'Tổng Kiện Hàng Đã Quét',
      alreadyDelivered: 'Đã Phân Loại Thành Công',
      productReturn: 'Hàng Lỗi / Loại (Reject)',
      turnoverRate: 'Tốc Độ Băng Tải',
      passRate: 'Tỷ lệ đạt chuẩn',
      sinceLastMonth: 'So với ca trước',
      rejectRate: 'Tỷ lệ lỗi',
      conveyorSpeed: 'Vận tốc: 1.2 m/s',
      efficiency: 'Hiệu suất vận hành',
    },

    // Volume Chart
    volumeChart: {
      title: 'Lưu Lượng Phân Loại & Băng Tải Thời Gian Thực',
      subtitle: 'Sản lượng phân loại theo từng cửa & lưu lượng hàng trên dây chuyền',
      stockVolume: 'Lưu lượng quét',
      consume: 'Đã xuất kho',
      monthly: 'Theo Tháng',
      daily: 'Theo Ngày',
      hourly: 'Theo Giờ',
      all: 'Tất Cả Cửa',
      reject: 'Cửa Loại',
    },

    // Custom Tags Table
    customTags: {
      title: 'Danh Sách Cửa & Nhãn Phân Loại',
      subtitle: 'Trạng thái hoạt động & số lượng kiện hàng thực tế theo từng cửa',
      allGates: 'Tất Cả Cửa',
      fastMoving: 'Tốc Độ Cao',
      discounted: 'Ưu Tiên',
      lowDemand: 'Ít Kiện',
      addNewGate: '+ Thêm Cửa Mới',
      edit: 'Sửa Cửa',
      testTrigger: 'Bắn Thử Xung PLC',
      capacity: 'Sức chứa',
      quantity: 'Số lượng',
      plcSignal: 'Tín hiệu PLC',
      qrKeyword: 'Từ khóa QR',
    },

    // Recent Sales & Order (Scan History)
    salesOrder: {
      title: 'Lịch Sử Quét Hàng Trực Tiếp',
      subtitle: 'Dữ liệu thời gian thực từ Camera AI & Cảm biến nhận diện',
      productName: 'Tên Kiện Hàng / Khu Vực',
      scanTime: 'Thời Gian',
      priority: 'Trạng Thái',
      actions: 'Thao Tác',
      sorted: 'Đã Phân Loại',
      rejected: 'Bị Loại (Reject)',
      waitingForParcels: 'Đang chờ kiện hàng chạy qua camera...',
      realTimeLog: 'Log Nhận Diện Thời Gian Thực',
      emptyHint: 'Đặt sản phẩm hoặc mã QR vào vùng nhận diện camera để phân loại.',
    },

    // AI Recommendation
    aiRecommendation: {
      title: 'Gợi Ý Tối Ưu Băng Chuyền AI',
      subtitle: 'Phân tích tự động lưu lượng phân loại các quận Đà Nẵng',
      fastMovingAlert: 'Cửa Quận Hải Châu có lưu lượng cao nhất hôm nay. Cân nhắc tăng công suất băng chuyền nhánh.',
      urgentReview: 'Cửa Quận Cẩm Lệ sắp đầy (trên 80%). Đề xuất vận chuyển kiện hàng sang kho dự phòng.',
      allNormal: 'Tất cả các cửa phân loại đang hoạt động ở mức tải tối ưu (1.2 m/s).',
    },

    // Still Not Arrived
    stillNotArrived: {
      title: 'Sức Chứa Cửa Còn Trống',
      subtitle: 'Khả năng tiếp nhận kiện hàng còn lại của các cửa',
      slotsRemaining: 'vị trí còn trống',
      gatesReady: 'cửa sẵn sàng nhận hàng',
    },

    // PLC Modal
    plcModal: {
      modalTitle: 'Cấu Hình & Kết Nối PLC Modbus TCP',
      modalSubtitle: 'Giao tiếp PLC công nghiệp (Siemens, Mitsubishi, Delta) & Bộ mô phỏng ảo',
      currentStatus: 'Trạng Thái Hiện Tại',
      online: 'ĐANG KẾT NỐI (ONLINE)',
      offline: 'CHƯA KẾT NỐI (OFFLINE)',
      virtualSim: '🧪 GIẢ LẬP VIRTUAL',
      realPlc: '🏭 PLC THỰC TẾ',
      disconnect: 'Ngắt Kết Nối',
      connectNow: 'Kết Nối Ngay',
      operationMode: 'Chế Độ Hoạt Động (Mode)',
      simModeTitle: '🧪 Trình Giả Lập PLC',
      simModeDesc: 'Chạy Modbus Server ảo cục bộ (Port 503). Thích hợp test phần mềm khi không cắm dây mạng PLC.',
      realPlcTitle: '🏭 PLC Vật Lý Thật',
      realPlcDesc: 'Kết nối trực tiếp qua dây mạng LAN tới PLC (Siemens S7, Delta, Mitsubishi, FX5U) tại xưởng.',
      modbusParams: 'Thông Số Mạng Modbus TCP',
      ipAddress: 'Địa Chỉ IP PLC',
      tcpPort: 'Cổng TCP Port',
      slaveId: 'Slave ID / Unit ID',
      holdingRegister: 'Địa Chỉ Thanh Ghi (Holding Register)',
      saveAndReconnect: 'Lưu & Kết Nối Lại PLC',
      pulseTestTitle: 'Bắn Xung Tín Hiệu Kiểm Thử (Manual Pulse Test)',
      pulseTestSubtitle: 'Ghi trực tiếp vào Register',
      gate1: 'Cửa 1 (Hải Châu)',
      gate2: 'Cửa 2 (Thanh Khê)',
      gate3: 'Cửa 3 (Liên Chiểu)',
      gate4: 'Cửa 4 (Ngũ Hành Sơn)',
      gate5: 'Cửa 5 (Cẩm Lệ)',
      gateReject: 'Cửa Loại (Reject)',
      customWrite: 'Ghi tùy chọn',
      testSend: 'Ghi Test',
      note: '* Lưu ý: Khi cắm PLC thật, máy tính cần đặt cùng dải IP mạng (vd: 192.168.0.x / 24).',
      close: 'Đóng',
    },

    // Gate Modal (CRUD)
    gateModal: {
      addTitle: 'Thêm Cửa Phân Loại Mới',
      editTitle: 'Chỉnh Sửa Thông Tin Cửa Phân Loại',
      subtitle: 'Cấu hình thông số kỹ thuật, quận nhận hàng, tín hiệu PLC & dung lượng chứa',
      gateName: 'Tên Cửa',
      district: 'Quận / Khu Vực Tiếp Nhận',
      skuCode: 'Mã Sản Phẩm (SKU / Product Code)',
      plcSignal: 'Mã Tín Hiệu PLC (Holding Register Value)',
      qrKeyword: 'Từ Khóa Mã QR (QR Keyword)',
      capacity: 'Sức Chứa Tối Đa (Kiện)',
      currentQty: 'Số Lượng Hiện Tại',
      colorPreset: 'Màu Nhận Diện',
      resetQty: 'Đặt Lại Số Lượng Về 0',
      deleteGate: 'Xóa Cửa Này',
      saveChanges: 'Lưu Cập Nhật',
      createGate: 'Tạo Cửa Mới',
      cancel: 'Hủy',
    },

    // Manual Page
    manual: {
      title: 'Điều Khiển Thủ Công & Kiểm Thử PLC',
      subtitle: 'Thao tác cưỡng bức băng tải, xi lanh gạt Cửa 1..5, và kiểm tra cơ cấu chấp hành.',
      configPlc: 'Cấu Hình & Kết Nối PLC',
      autoMode: 'CHẾ ĐỘ TỰ ĐỘNG (AUTO)',
      manualMode: 'CHẾ ĐỘ THỦ CÔNG (MANUAL)',
      autoWarning: 'Các nút bấm đang bị khóa vì hệ thống đang ở Chế độ Tự Động. Hãy chuyển sang MANUAL MODE để điều khiển.',
      conveyorMotor: 'Động Cơ Băng Tải Chính',
      startConveyor: 'Bật Băng Tải',
      stopConveyor: 'Dừng Băng Tải',
      pushersTitle: 'Cơ Cấu Xi Lanh Khí Nén Từng Cửa',
      extendPusher: 'Đẩy Ra',
      retractPusher: 'Thu Về',
    },

    // Common / Notifications
    common: {
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo',
      info: 'Thông tin',
      language: 'Ngôn ngữ',
      vietnamese: 'Tiếng Việt',
      english: 'English',
    },
  },

  en: {
    // Navigation / Sidebar
    nav: {
      dashboard: 'Warehouse Vault',
      visionAi: 'Vision AI & Camera',
      inventory: 'Inventory & Chutes',
      manualPlc: 'Manual PLC Control',
      alarms: 'Alarm Center',
      history: 'History & Reports',
      qrGen: 'QR Code Generator',
      settings: 'System Settings',
      online: 'Online',
      offline: 'Disconnected',
      systemActive: 'System Active',
    },

    // Header
    header: {
      industrialPlc: 'Industrial PLC',
      live: 'LIVE',
      wsOffline: 'WS OFFLINE',
      plcConnected: 'PLC: CONNECTED',
      plcDisconnected: 'PLC: DISCONNECTED',
      searchPlaceholder: 'Search chutes, tags, rules...',
      filter: 'Filter',
      alarms: 'Alarms',
      printQr5Districts: '+ Print 5 District QRs',
      eStopActive: 'E-STOP ACTIVE - HARDWARE SAFETY INTERLOCK ENGAGED',
      titles: {
        dashboard: 'Warehouse Vault Inventory',
        vision: 'Vision AI & Machine Vision',
        bins: 'Sorting Gates & Chutes',
        manual: 'Manual PLC & Actuator Control',
        alarms: 'Alarm Center & Fault Diagnostics',
        history: 'Sorting History & Analytics',
        qr: 'QR Code Label Generator',
        settings: 'System Configuration',
      },
    },

    // Dashboard Stat Cards
    stats: {
      totalOrders: 'Total Orders Scanned',
      alreadyDelivered: 'Already Sorted & Delivered',
      productReturn: 'Rejected / Faulty Items',
      turnoverRate: 'Conveyor Turnover Rate',
      passRate: 'Pass rate',
      sinceLastMonth: 'Since last shift',
      rejectRate: 'Rejection rate',
      conveyorSpeed: 'Belt speed: 1.2 m/s',
      efficiency: 'System efficiency',
    },

    // Volume Chart
    volumeChart: {
      title: 'Total Stock Volume vs Consume Rate',
      subtitle: 'Real-time sorting throughput & conveyor belt traffic analytics',
      stockVolume: 'Stock volume',
      consume: 'Dispatched',
      monthly: 'Monthly',
      daily: 'Daily',
      hourly: 'Hourly',
      all: 'All Chutes',
      reject: 'Reject Chute',
    },

    // Custom Tags Table
    customTags: {
      title: 'Custom Tags & Chute Labels',
      subtitle: 'Categories by AI Assistant & sorting gate allocation status',
      allGates: 'All Gates',
      fastMoving: 'Fast Moving',
      discounted: 'Priority',
      lowDemand: 'Low Demand',
      addNewGate: '+ Add New Gate',
      edit: 'Edit Gate',
      testTrigger: 'Pulse PLC Signal',
      capacity: 'Capacity',
      quantity: 'Quantity',
      plcSignal: 'PLC Signal',
      qrKeyword: 'QR Keyword',
    },

    // Recent Sales & Order (Scan History)
    salesOrder: {
      title: 'Real-Time Scanned Orders',
      subtitle: 'Live data stream from Machine Vision camera & QR decoder',
      productName: 'Parcel Name / District',
      scanTime: 'Time',
      priority: 'Status',
      actions: 'Actions',
      sorted: 'Sorted',
      rejected: 'Rejected',
      waitingForParcels: 'Waiting for parcels to pass under camera...',
      realTimeLog: 'Live Recognition Log',
      emptyHint: 'Place a package or QR code in front of the camera lens to classify.',
    },

    // AI Recommendation
    aiRecommendation: {
      title: 'AI Conveyor Recommendation',
      subtitle: 'Automated sorting flow optimization for Da Nang districts',
      fastMovingAlert: 'Hai Chau chute exhibits the highest traffic today. Consider increasing conveyor feed rate.',
      urgentReview: 'Cam Le chute is near capacity (>80%). Recommend dispatching parcels to buffer storage.',
      allNormal: 'All sorting gates operating at optimal capacity (1.2 m/s).',
    },

    // Still Not Arrived
    stillNotArrived: {
      title: 'Chute Capacity Available',
      subtitle: 'Remaining parcel holding capacity across all active chutes',
      slotsRemaining: 'available slots',
      gatesReady: 'gates ready for inbound parcels',
    },

    // PLC Modal
    plcModal: {
      modalTitle: 'PLC Modbus TCP Configuration & Connect',
      modalSubtitle: 'Industrial PLC fieldbus (Siemens, Mitsubishi, Delta) & virtual simulator',
      currentStatus: 'Current Status',
      online: 'CONNECTED (ONLINE)',
      offline: 'NOT CONNECTED (OFFLINE)',
      virtualSim: '🧪 VIRTUAL SIMULATOR',
      realPlc: '🏭 PHYSICAL PLC',
      disconnect: 'Disconnect',
      connectNow: 'Connect Now',
      operationMode: 'Operation Mode',
      simModeTitle: '🧪 Virtual PLC Simulator',
      simModeDesc: 'Runs internal local Modbus server (Port 503). Ideal for testing without physical wiring.',
      realPlcTitle: '🏭 Physical Hardware PLC',
      realPlcDesc: 'Connects directly over industrial LAN Ethernet to PLC (Siemens S7, Delta, Mitsubishi, FX5U).',
      modbusParams: 'Modbus TCP Network Parameters',
      ipAddress: 'PLC IP Address',
      tcpPort: 'TCP Port',
      slaveId: 'Slave ID / Unit ID',
      holdingRegister: 'Holding Register Offset',
      saveAndReconnect: 'Save & Reconnect PLC',
      pulseTestTitle: 'Manual Pulse Test Signals',
      pulseTestSubtitle: 'Writes directly to Holding Register',
      gate1: 'Gate 1 (Hai Chau)',
      gate2: 'Gate 2 (Thanh Khe)',
      gate3: 'Gate 3 (Lien Chieu)',
      gate4: 'Gate 4 (Ngu Hanh Son)',
      gate5: 'Gate 5 (Cam Le)',
      gateReject: 'Reject Chute',
      customWrite: 'Custom Write',
      testSend: 'Send Pulse',
      note: '* Note: When connecting to a physical PLC, ensure your PC is on the same subnet (e.g. 192.168.0.x / 24).',
      close: 'Close',
    },

    // Gate Modal (CRUD)
    gateModal: {
      addTitle: 'Add New Sorting Chute',
      editTitle: 'Edit Sorting Chute Parameters',
      subtitle: 'Configure technical signals, destination district, PLC code & capacity limit',
      gateName: 'Chute Name',
      district: 'District / Destination Area',
      skuCode: 'SKU / Product Code',
      plcSignal: 'PLC Signal Code (Holding Register Value)',
      qrKeyword: 'QR Keyword Filter',
      capacity: 'Max Capacity (Parcels)',
      currentQty: 'Current Quantity',
      colorPreset: 'Display & Color Tag',
      resetQty: 'Reset Counter to 0',
      deleteGate: 'Delete This Gate',
      saveChanges: 'Save Changes',
      createGate: 'Create Gate',
      cancel: 'Cancel',
    },

    // Manual Page
    manual: {
      title: 'Manual Actuator & PLC Control',
      subtitle: 'Manual override for main conveyor motor, gate pushers 1..5, and diagnostic tests.',
      configPlc: 'Configure & Connect PLC',
      autoMode: 'AUTO MODE',
      manualMode: 'MANUAL MODE',
      autoWarning: 'Controls are locked while machine is in AUTO mode. Switch to MANUAL MODE to test actuators.',
      conveyorMotor: 'Main Conveyor Motor',
      startConveyor: 'Start Conveyor',
      stopConveyor: 'Stop Conveyor',
      pushersTitle: 'Pneumatic Chute Pushers',
      extendPusher: 'Extend',
      retractPusher: 'Retract',
    },

    // Common / Notifications
    common: {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      language: 'Language',
      vietnamese: 'Tiếng Việt',
      english: 'English',
    },
  },
};

type RecursiveString<T> = {
  [K in keyof T]: T[K] extends object ? RecursiveString<T[K]> : string;
};

export type TranslationSchema = RecursiveString<typeof rawTranslations['vi']>;
export const translations: Record<Language, TranslationSchema> = rawTranslations;
export type TranslationKey = TranslationSchema;
