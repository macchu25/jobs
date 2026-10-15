"""
Chế độ chạy không cần giao diện cửa sổ (Headless Mode):
Khởi chạy Webcam OpenCV + Thuật toán Nhận diện QR/Màu sắc + Kết nối PLC Modbus TCP + Web Bridge (Port 8080)
Dành cho máy chủ, Raspberry Pi hoặc chạy ngầm.
"""
import os
import sys
import json
import time
import signal
import logging

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("HeadlessClassifier")

# Đảm bảo đường dẫn import
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from PyQt5.QtCore import QCoreApplication
from src.plc.modbus_client import ModbusPLCClient
from src.plc.plc_simulator import PLCSimulator
from src.vision.camera_thread import CameraProcessingThread
from src.server.web_bridge import WebBridge

class HeadlessRunner:
    def __init__(self, config_path="config.json", port=8080):
        self.config_path = config_path
        self.port = port
        self.config = self._load_config()
        self.counters = {"TOTAL": 0, "GATE_1": 0, "GATE_2": 0, "GATE_3": 0, "GATE_4": 0, "GATE_5": 0, "REJECT": 0}

        # 1. Khởi tạo PLC & Simulator
        plc_cfg = self.config.get("plc", {})
        is_sim = plc_cfg.get("simulation_mode", True)
        sim_host = "127.0.0.1" if is_sim else plc_cfg.get("ip", "127.0.0.1")
        self.plc_simulator = PLCSimulator(host=sim_host, port=plc_cfg.get("port", 502))

        if is_sim:
            self.plc_simulator.start()
            self.plc_simulator.on_register_change = self._on_sim_register_changed

        self.plc_client = ModbusPLCClient(
            host=self.plc_simulator.host if is_sim else plc_cfg.get("ip", "127.0.0.1"),
            port=self.plc_simulator.port if is_sim else plc_cfg.get("port", 502),
            slave_id=plc_cfg.get("slave_id", 1)
        )

        # 2. Khởi tạo Camera Thread
        self.camera_thread = CameraProcessingThread(self.config, self.plc_client)

        # 3. Khởi tạo Web Bridge
        self.web_bridge = WebBridge(main_window=self, host="0.0.0.0", port=self.port)

        # 4. Kết nối tín hiệu
        self.camera_thread.frame_processed.connect(self.on_frame)
        self.camera_thread.product_scanned.connect(self.on_product_scanned)
        self.camera_thread.log_message.connect(self.on_log)

    def _load_config(self):
        if os.path.exists(self.config_path):
            with open(self.config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def start(self):
        logger.info("=" * 60)
        logger.info("KHỞI CHẠY HỆ THỐNG PHÂN LOẠI HEADLESS (CAMERA + PLC + WEB BRIDGE)")
        logger.info(f"Web HMI API & WebSocket: http://localhost:{self.port}")
        logger.info("=" * 60)

        # Kết nối PLC
        self.plc_client.connect()
        # Bắt đầu camera
        self.camera_thread.start()
        # Bắt đầu Web Bridge
        self.web_bridge.start()

    def stop(self):
        logger.info("Đang dừng hệ thống...")
        if self.camera_thread.running:
            self.camera_thread.stop()
        self.plc_client.disconnect()
        if self.plc_simulator.running:
            self.plc_simulator.stop()
        self.web_bridge.stop()
        logger.info("Đã dừng an toàn.")

    def on_frame(self, frame):
        self.web_bridge.push_frame(frame)

    def on_product_scanned(self, info):
        cls = info.get("classification", {})
        gate_id = cls.get("gate_id", 1)
        self.counters["TOTAL"] += 1
        if gate_id == 1: self.counters["GATE_1"] += 1
        elif gate_id == 2: self.counters["GATE_2"] += 1
        elif gate_id == 3: self.counters["GATE_3"] += 1
        elif gate_id == 4: self.counters["GATE_4"] += 1
        elif gate_id == 5: self.counters["GATE_5"] += 1
        else: self.counters["REJECT"] += 1

        self.web_bridge.push_detection(info, self.counters)

    def on_log(self, msg, level="INFO"):
        self.web_bridge.push_log(msg, level)

    def _on_sim_register_changed(self, reg_addr, reg_val):
        msg = f"[SIMULATOR GIẢ LẬP] Đã ghi nhận Holding Register {reg_addr} = {reg_val}"
        self.web_bridge.push_log(msg, "INFO")

    def connect_plc(self):
        """Kết nối tới PLC hoặc Simulator"""
        host = self.plc_client.host
        port = self.plc_client.port
        is_sim = self.config.get("plc", {}).get("simulation_mode", True)
        sim_str = " (SIMULATOR)" if is_sim else " (REAL HARDWARE)"
        logger.info(f"Đang kết nối tới PLC tại {host}:{port}{sim_str}...")
        self.web_bridge.push_log(f"Đang kết nối tới PLC tại {host}:{port}{sim_str}...", "INFO")
        
        success = self.plc_client.connect()
        if success:
            logger.info(f"Kết nối PLC thành công!{sim_str}")
            self.web_bridge.push_log(f"Kết nối PLC thành công!{sim_str}", "INFO")
            self.web_bridge.push_plc_status(True, f"ONLINE{sim_str}")
        else:
            logger.warning(f"Không thể kết nối PLC: {self.plc_client.last_error}")
            self.web_bridge.push_log(f"Không thể kết nối PLC: {self.plc_client.last_error}", "WARN")
            self.web_bridge.push_plc_status(False, "ERROR")
        return success

    def disconnect_plc(self):
        """Ngắt kết nối PLC"""
        self.plc_client.disconnect()
        logger.info("Đã ngắt kết nối PLC.")
        self.web_bridge.push_log("Đã ngắt kết nối PLC.", "INFO")
        self.web_bridge.push_plc_status(False, "DISCONNECTED")
        return True

    def toggle_plc_connection(self):
        if self.plc_client.connected:
            return self.disconnect_plc()
        else:
            return self.connect_plc()

    def update_plc_config(self, ip="127.0.0.1", port=502, slave_id=1, register_address=0, simulation_mode=True):
        """Cập nhật thông số kết nối PLC trực tiếp từ Web HMI và lưu config.json"""
        if "plc" not in self.config:
            self.config["plc"] = {}
        
        self.config["plc"]["ip"] = ip
        self.config["plc"]["port"] = int(port)
        self.config["plc"]["slave_id"] = int(slave_id)
        self.config["plc"]["register_address"] = int(register_address)
        self.config["plc"]["simulation_mode"] = bool(simulation_mode)
        self._save_config()

        # Quản lý simulator
        if simulation_mode:
            if not self.plc_simulator.running:
                self.plc_simulator.host = "127.0.0.1"
                self.plc_simulator.port = int(port)
                self.plc_simulator.start()
                self.plc_simulator.on_register_change = self._on_sim_register_changed
            self.plc_client.host = "127.0.0.1"
        else:
            if self.plc_simulator.running:
                self.plc_simulator.stop()
            self.plc_client.host = ip

        self.plc_client.port = int(port)
        self.plc_client.slave_id = int(slave_id)

        # Cập nhật tham chiếu vào camera thread
        if hasattr(self, "camera_thread"):
            self.camera_thread.plc_client = self.plc_client
            self.camera_thread.config = self.config

        # Ngắt và kết nối lại
        self.plc_client.disconnect()
        success = self.connect_plc()
        return {
            "success": success,
            "connected": self.plc_client.connected,
            "host": self.plc_client.host,
            "port": self.plc_client.port,
            "slave_id": self.plc_client.slave_id,
            "simulation_mode": simulation_mode,
            "last_error": self.plc_client.last_error
        }

    def _save_config(self):
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            logger.info("Cấu hình config.json đã được lưu thành công.")
        except Exception as e:
            logger.error(f"Lỗi khi lưu config.json: {e}")

    def send_manual_plc_signal(self, val: int, reg_addr=None):
        if reg_addr is None:
            reg_addr = self.config.get("plc", {}).get("register_address", 0)
        success = self.plc_client.write_register(reg_addr, val)
        if success:
            self.web_bridge.push_log(f"[Thủ công Web] Đã ghi giá trị {val} vào Holding Register {reg_addr} PLC", "INFO")
        else:
            self.web_bridge.push_log(f"[Thủ công Web] Lỗi ghi PLC: {self.plc_client.last_error}", "ERROR")
        return {"success": success, "register": reg_addr, "value": val, "error": self.plc_client.last_error}

    def reset_counters(self):
        for k in self.counters:
            self.counters[k] = 0
        self.web_bridge.counters.update(self.counters)

def main():
    app = QCoreApplication(sys.argv)
    runner = HeadlessRunner()
    runner.start()

    def handle_sigint(sig, frame):
        runner.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
