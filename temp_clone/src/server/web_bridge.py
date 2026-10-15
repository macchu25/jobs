import asyncio
import base64
import json
import logging
import threading
import time
from typing import List, Optional, Dict, Any

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

logger = logging.getLogger("WebBridge")

DA_NANG_BINS_META = [
    {
        "id": "GATE_1",
        "gate_number": 1,
        "name": "Cửa 1 - Q. Hải Châu",
        "productCode": "DISTRICT_HAI_CHAU",
        "productName": "Quận Hải Châu (Màu Đỏ)",
        "colorHex": "#FF3B30",
        "qrKeyword": "HAI_CHAU",
        "plcSignal": 1,
        "capacity": 100,
    },
    {
        "id": "GATE_2",
        "gate_number": 2,
        "name": "Cửa 2 - Q. Thanh Khê",
        "productCode": "DISTRICT_THANH_KHE",
        "productName": "Quận Thanh Khê (Màu Xanh lá)",
        "colorHex": "#34C759",
        "qrKeyword": "THANH_KHE",
        "plcSignal": 2,
        "capacity": 100,
    },
    {
        "id": "GATE_3",
        "gate_number": 3,
        "name": "Cửa 3 - Q. Liên Chiểu",
        "productCode": "DISTRICT_LIEN_CHIEU",
        "productName": "Quận Liên Chiểu (Màu Xanh dương)",
        "colorHex": "#007AFF",
        "qrKeyword": "LIEN_CHIEU",
        "plcSignal": 3,
        "capacity": 100,
    },
    {
        "id": "GATE_4",
        "gate_number": 4,
        "name": "Cửa 4 - Q. Ngũ Hành Sơn",
        "productCode": "DISTRICT_NGU_HANH_SON",
        "productName": "Quận Ngũ Hành Sơn (Mã QR)",
        "colorHex": "#FF9500",
        "qrKeyword": "NGU_HANH_SON",
        "plcSignal": 4,
        "capacity": 100,
    },
    {
        "id": "GATE_5",
        "gate_number": 5,
        "name": "Cửa 5 - Q. Cẩm Lệ",
        "productCode": "DISTRICT_CAM_LE",
        "productName": "Quận Cẩm Lệ (Mã QR)",
        "colorHex": "#AF52DE",
        "qrKeyword": "CAM_LE",
        "plcSignal": 5,
        "capacity": 100,
    },
    {
        "id": "GATE_REJECT",
        "gate_number": 99,
        "name": "Cửa Loại - Reject",
        "productCode": "REJECT",
        "productName": "Sản Phẩm Lỗi / Không QR (Sig: 99)",
        "colorHex": "#FF453A",
        "qrKeyword": "NONE",
        "plcSignal": 99,
        "capacity": 100,
    },
]

class WebBridge:
    """
    Bridge connecting the Python OpenCV + PyQt5 + Modbus application
    with the React Web HMI dashboard via REST API and WebSockets.
    """
    def __init__(self, main_window=None, host="0.0.0.0", port=8080):
        self.main_window = main_window
        self.host = host
        self.port = port
        self.start_time = time.time()
        self.app = FastAPI(title="Industrial Sorting System Web Bridge")

        # Setup CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Threading & Async state
        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.server_thread: Optional[threading.Thread] = None
        self.is_running = False
        self.active_connections: List[WebSocket] = []
        self._conn_lock = threading.Lock()

        # Telemetry Cache
        self.counters = {
            "TOTAL": 0,
            "GATE_1": 0,
            "GATE_2": 0,
            "GATE_3": 0,
            "GATE_4": 0,
            "GATE_5": 0,
            "REJECT": 0,
        }
        self.history: List[Dict[str, Any]] = []
        self.logs: List[Dict[str, Any]] = []
        self.latest_detection: Dict[str, Any] = {
            "qr_data": "N/A",
            "color": "UNKNOWN",
            "color_confidence": 0,
            "gate_id": 0,
            "plc_signal_value": 0,
            "rule_name": "Sẵn sàng nhận diện...",
            "timestamp": "--:--:--"
        }

        # Bins metadata for full CRUD operations
        self.bins_meta: List[Dict[str, Any]] = [dict(b) for b in DA_NANG_BINS_META]

        # Frame buffer for MJPEG streaming
        self._latest_jpeg: Optional[bytes] = None
        self._frame_lock = threading.Lock()
        self._create_default_placeholder_frame()

        self._register_routes()

    def _create_default_placeholder_frame(self):
        """Creates a nice dark placeholder image when camera is off"""
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (20, 20, 24)
        cv2.putText(
            img, "DANG CHO LUONG CAMERA OPENCV...", (70, 220),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 229, 255), 2, cv2.LINE_AA
        )
        cv2.putText(
            img, "HE THONG PHAN LOAI QUAN/HUYEN DA NANG", (100, 260),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 170), 1, cv2.LINE_AA
        )
        _, encoded = cv2.imencode(".jpg", img)
        self._latest_jpeg = encoded.tobytes()

    def _register_routes(self):
        app = self.app

        @app.get("/api/health")
        async def get_health():
            plc_ok = self.is_plc_connected()
            cam_ok = self.is_camera_active()
            return {
                "success": True,
                "data": {
                    "status": "ok",
                    "plc": plc_ok,
                    "camera": cam_ok,
                    "uptime": int(time.time() - self.start_time),
                    "websocketClients": len(self.active_connections),
                }
            }

        @app.get("/api/status")
        async def get_status():
            return {
                "success": True,
                "data": self.get_system_snapshot()
            }

        @app.get("/api/config/public")
        async def get_public_config():
            cfg = self.get_config()
            plc_cfg = cfg.get("plc", {})
            return {
                "success": True,
                "data": {
                    "plcMode": "simulation" if plc_cfg.get("simulation_mode", True) else "real",
                    "plcProtocol": "modbus_tcp",
                    "plcHost": plc_cfg.get("ip", "127.0.0.1"),
                    "plcPort": plc_cfg.get("port", 502),
                    "pollIntervalMs": 250,
                    "enableRealPLCWrites": not plc_cfg.get("simulation_mode", True),
                    "authEnabled": False,
                    "serverVersion": "2.0.0-PythonBridge",
                }
            }

        @app.get("/api/bins")
        async def get_bins():
            return {
                "success": True,
                "data": self.get_bins_data()
            }

        @app.post("/api/bins")
        async def create_bin(bin_data: dict):
            new_id = bin_data.get("id") or f"GATE_{len(self.bins_meta) + 1}"
            for b in self.bins_meta:
                if b["id"] == new_id:
                    raise HTTPException(status_code=400, detail="Mã Cửa ID đã tồn tại")
            
            gate_num = int(bin_data.get("gate_number") or bin_data.get("plcSignal") or (len(self.bins_meta) + 1))
            new_bin = {
                "id": new_id,
                "gate_number": gate_num,
                "name": bin_data.get("name", f"Cửa {gate_num}"),
                "productCode": bin_data.get("productCode", f"DISTRICT_{gate_num}"),
                "productName": bin_data.get("productName", bin_data.get("name")),
                "colorHex": bin_data.get("colorHex", "#34C759"),
                "qrKeyword": bin_data.get("qrKeyword", "NONE"),
                "plcSignal": int(bin_data.get("plcSignal", gate_num)),
                "capacity": int(bin_data.get("capacity", 100)),
            }
            self.bins_meta.append(new_bin)
            self.counters[new_id] = int(bin_data.get("quantity", 0))
            await self._broadcast_bins_update()
            return {"success": True, "data": new_bin}

        @app.put("/api/bins/{bin_id}")
        async def update_bin(bin_id: str, bin_data: dict):
            target = None
            for b in self.bins_meta:
                if b["id"] == bin_id:
                    target = b
                    break
            if not target:
                raise HTTPException(status_code=404, detail="Không tìm thấy cửa")
            
            if "name" in bin_data: target["name"] = bin_data["name"]
            if "productCode" in bin_data: target["productCode"] = bin_data["productCode"]
            if "productName" in bin_data: target["productName"] = bin_data["productName"]
            if "colorHex" in bin_data: target["colorHex"] = bin_data["colorHex"]
            if "qrKeyword" in bin_data: target["qrKeyword"] = bin_data["qrKeyword"]
            if "plcSignal" in bin_data: target["plcSignal"] = int(bin_data["plcSignal"])
            if "capacity" in bin_data: target["capacity"] = int(bin_data["capacity"])
            if "quantity" in bin_data:
                qty = int(bin_data["quantity"])
                self.counters[bin_id] = qty
                g_num = target.get("gate_number")
                if g_num == 1: self.counters["GATE_1"] = qty
                elif g_num == 2: self.counters["GATE_2"] = qty
                elif g_num == 3: self.counters["GATE_3"] = qty
                elif g_num == 4: self.counters["GATE_4"] = qty
                elif g_num == 5: self.counters["GATE_5"] = qty
                elif g_num == 99: self.counters["REJECT"] = qty

            await self._broadcast_bins_update()
            return {"success": True, "data": target}

        @app.delete("/api/bins/{bin_id}")
        async def delete_bin(bin_id: str):
            found_idx = -1
            for idx, b in enumerate(self.bins_meta):
                if b["id"] == bin_id:
                    found_idx = idx
                    break
            if found_idx == -1:
                raise HTTPException(status_code=404, detail="Không tìm thấy cửa")
            
            removed = self.bins_meta.pop(found_idx)
            await self._broadcast_bins_update()
            return {"success": True, "data": removed}

        @app.post("/api/bins/{bin_id}/reset")
        async def reset_single_bin(bin_id: str):
            self.counters[bin_id] = 0
            for b in self.bins_meta:
                if b["id"] == bin_id:
                    g_num = b.get("gate_number")
                    if g_num == 1: self.counters["GATE_1"] = 0
                    elif g_num == 2: self.counters["GATE_2"] = 0
                    elif g_num == 3: self.counters["GATE_3"] = 0
                    elif g_num == 4: self.counters["GATE_4"] = 0
                    elif g_num == 5: self.counters["GATE_5"] = 0
                    elif g_num == 99: self.counters["REJECT"] = 0
            await self._broadcast_bins_update()
            return {"success": True}

        @app.post("/api/bins/restore_defaults")
        async def restore_default_bins():
            self.bins_meta = [dict(b) for b in DA_NANG_BINS_META]
            await self._broadcast_bins_update()
            return {"success": True, "data": self.get_bins_data()}

        @app.post("/api/bins/{bin_id}/call")
        async def call_bin(bin_id: str):
            gate_id = 99
            if bin_id.startswith("GATE_"):
                try:
                    gate_id = int(bin_id.replace("GATE_", ""))
                except ValueError:
                    gate_id = 99
            elif bin_id.isdigit():
                gate_id = int(bin_id)
            
            success = self.trigger_gate(gate_id)
            return {
                "success": success,
                "data": {
                    "id": f"cmd_{int(time.time())}",
                    "type": "CALL_BIN",
                    "binId": bin_id,
                    "status": "COMPLETED" if success else "FAILED",
                    "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            }

        @app.post("/api/trigger/{gate_id}")
        async def trigger_gate_endpoint(gate_id: int):
            success = self.trigger_gate(gate_id)
            return {"success": success, "gate_id": gate_id}

        @app.post("/api/conveyor/start")
        async def start_conveyor():
            return {"success": True, "data": {"conveyor": "RUNNING"}}

        @app.post("/api/conveyor/stop")
        async def stop_conveyor():
            return {"success": True, "data": {"conveyor": "STOPPED"}}

        @app.post("/api/machine/auto")
        async def set_machine_auto():
            return {"success": True, "data": {"machineMode": "AUTO"}}

        @app.post("/api/machine/manual")
        async def set_machine_manual():
            return {"success": True, "data": {"machineMode": "MANUAL"}}

        @app.post("/api/reset_counters")
        async def reset_counters():
            self.do_reset_counters()
            return {"success": True}

        @app.get("/api/plc/config")
        async def get_plc_config():
            cfg = self.get_config()
            plc_cfg = cfg.get("plc", {})
            conn = self.is_plc_connected()
            last_err = ""
            if self.main_window and hasattr(self.main_window, "plc_client"):
                last_err = getattr(self.main_window.plc_client, "last_error", "")
            return {
                "success": True,
                "data": {
                    "ip": plc_cfg.get("ip", "192.168.0.1"),
                    "port": plc_cfg.get("port", 503),
                    "slave_id": plc_cfg.get("slave_id", 1),
                    "register_address": plc_cfg.get("register_address", 0),
                    "simulation_mode": plc_cfg.get("simulation_mode", True),
                    "auto_reconnect": plc_cfg.get("auto_reconnect", True),
                    "connected": conn,
                    "last_error": last_err
                }
            }

        @app.post("/api/plc/connect")
        async def connect_plc_endpoint(body: dict = None):
            body = body or {}
            if self.main_window and hasattr(self.main_window, "update_plc_config") and ("ip" in body or "simulation_mode" in body):
                res = self.main_window.update_plc_config(
                    ip=body.get("ip", self.main_window.config.get("plc", {}).get("ip", "192.168.0.1")),
                    port=int(body.get("port", self.main_window.config.get("plc", {}).get("port", 502))),
                    slave_id=int(body.get("slave_id", self.main_window.config.get("plc", {}).get("slave_id", 1))),
                    register_address=int(body.get("register_address", self.main_window.config.get("plc", {}).get("register_address", 0))),
                    simulation_mode=bool(body.get("simulation_mode", self.main_window.config.get("plc", {}).get("simulation_mode", True)))
                )
                return {"success": res.get("success", False), "data": res}
            elif self.main_window and hasattr(self.main_window, "connect_plc"):
                ok = self.main_window.connect_plc()
                err = getattr(self.main_window.plc_client, "last_error", "")
                return {"success": ok, "data": {"connected": ok, "last_error": err}}
            return {"success": True, "data": {"connected": True}}

        @app.post("/api/plc/disconnect")
        async def disconnect_plc_endpoint():
            if self.main_window and hasattr(self.main_window, "disconnect_plc"):
                self.main_window.disconnect_plc()
                return {"success": True, "data": {"connected": False}}
            return {"success": True}

        @app.post("/api/plc/write")
        async def write_plc_endpoint(body: dict):
            reg = int(body.get("register", 0))
            val = int(body.get("value", 1))
            if self.main_window and hasattr(self.main_window, "send_manual_plc_signal"):
                res = self.main_window.send_manual_plc_signal(val, reg)
                return {"success": res["success"], "data": res}
            elif self.main_window and hasattr(self.main_window, "plc_client"):
                ok = self.main_window.plc_client.write_register(reg, val)
                return {"success": ok, "data": {"register": reg, "value": val, "error": self.main_window.plc_client.last_error}}
            return {"success": True, "data": {"register": reg, "value": val}}

        @app.post("/api/mode")
        async def set_mode(body: dict):
            target_mode = body.get("mode", "simulation")
            sim_mode = (target_mode == "simulation")
            cfg = self.get_config()
            plc_cfg = cfg.get("plc", {})
            if self.main_window and hasattr(self.main_window, "update_plc_config"):
                res = self.main_window.update_plc_config(
                    ip=plc_cfg.get("ip", "192.168.0.1"),
                    port=plc_cfg.get("port", 502),
                    slave_id=plc_cfg.get("slave_id", 1),
                    register_address=plc_cfg.get("register_address", 0),
                    simulation_mode=sim_mode
                )
                return {"success": True, "data": {"mode": target_mode, "plc": res}}
            return {"success": True, "data": {"mode": target_mode}}

        @app.get("/api/history")
        async def get_history():
            return {"success": True, "data": self.history}

        @app.get("/api/alarms")
        async def get_alarms():
            return {"success": True, "data": []}

        @app.get("/api/telemetry")
        async def get_telemetry():
            """Returns rich telemetry matching original python parameters"""
            cfg = self.get_config()
            plc_cfg = cfg.get("plc", {})
            return {
                "system": {
                    "backendConnected": True,
                    "plcConnected": self.is_plc_connected(),
                    "mode": "SIMULATION" if plc_cfg.get("simulation_mode", True) else "PLC",
                    "lineName": "Dây Chuyền Phân Loại Tự Động (Đà Nẵng)",
                    "plcIp": plc_cfg.get("ip", "127.0.0.1"),
                    "plcPort": plc_cfg.get("port", 502),
                    "slaveId": plc_cfg.get("slave_id", 1),
                    "registerAddress": plc_cfg.get("register_address", 0),
                    "cameraActive": self.is_camera_active(),
                    "cameraFps": cfg.get("camera", {}).get("fps", 30),
                    "conveyorSpeed": 1.2,
                    "fastMode": cfg.get("system", {}).get("high_speed_conveyor_mode", True),
                    "lastSignalValue": self.latest_detection.get("plc_signal_value", 0),
                    "lastDetectedQr": self.latest_detection.get("qr_data", "N/A"),
                    "lastDetectedColor": self.latest_detection.get("color", "UNKNOWN"),
                    "lastColorConfidence": self.latest_detection.get("color_confidence", 0),
                    "lastGateName": self.latest_detection.get("rule_name", "N/A")
                },
                "totalToday": self.counters["TOTAL"],
                "totalPassed": self.counters["TOTAL"] - self.counters["REJECT"],
                "totalRejected": self.counters["REJECT"],
                "passRate": round(((self.counters["TOTAL"] - self.counters["REJECT"]) / max(1, self.counters["TOTAL"])) * 100, 1),
                "bins": self.get_bins_data(),
                "history": self.history[:20],
                "rules": cfg.get("rules", []),
                "visionConfig": {
                    "deviceIndex": cfg.get("camera", {}).get("device_index", 0),
                    "resolution": f"{cfg.get('camera', {}).get('width', 1280)}x{cfg.get('camera', {}).get('height', 720)} @ {cfg.get('camera', {}).get('fps', 30)} FPS",
                    "fps": cfg.get("camera", {}).get("fps", 30),
                    "loopDelay": "0.005s",
                    "confidenceFrames": cfg.get("system", {}).get("detection_confidence_frames", 1),
                    "minColorRatio": cfg.get("system", {}).get("min_color_ratio", 0.04),
                    "skinToneSaturationMin": 150,
                    "roi": cfg.get("system", {}).get("roi_box", [200, 100, 880, 520])
                }
            }

        @app.get("/api/video_feed")
        async def video_feed():
            """MJPEG video stream endpoint for real-time web display"""
            async def frame_generator():
                while self.is_running:
                    with self._frame_lock:
                        data = self._latest_jpeg
                    if not data:
                        self._create_default_placeholder_frame()
                        data = self._latest_jpeg

                    if data:
                        yield (
                            b"--frame\r\n"
                            b"Content-Type: image/jpeg\r\n\r\n" + data + b"\r\n"
                        )
                    await asyncio.sleep(0.033)  # Non-blocking ~30 FPS
            return StreamingResponse(
                frame_generator(),
                media_type="multipart/x-mixed-replace; boundary=frame"
            )

        @app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await websocket.accept()
            with self._conn_lock:
                self.active_connections.append(websocket)
            logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")

            try:
                # Send initial full snapshot
                snapshot = self.get_system_snapshot()
                await websocket.send_text(json.dumps({"event": "snapshot", "payload": snapshot}) + "\n")
                # Also send telemetry event
                telemetry = await get_telemetry()
                await websocket.send_text(json.dumps({"event": "telemetry", "payload": telemetry}) + "\n")

                while True:
                    text = await websocket.receive_text()
                    try:
                        msg = json.loads(text)
                        await self._handle_client_message(msg, websocket)
                    except Exception as e:
                        logger.error(f"Error handling WS message: {e}")
            except WebSocketDisconnect:
                pass
            finally:
                with self._conn_lock:
                    if websocket in self.active_connections:
                        self.active_connections.remove(websocket)
                logger.info("WebSocket client disconnected.")

    async def _handle_client_message(self, msg: dict, websocket: WebSocket):
        action = msg.get("action")
        payload = msg.get("payload", {})

        if action == "trigger_gate":
            gate_id = payload.get("gate_id", 1)
            self.trigger_gate(gate_id)
        elif action == "reset_counters":
            self.do_reset_counters()
        elif action == "toggle_camera":
            if self.main_window and hasattr(self.main_window, "toggle_camera"):
                self.main_window.toggle_camera()
        elif action == "toggle_plc":
            if self.main_window and hasattr(self.main_window, "toggle_plc_connection"):
                self.main_window.toggle_plc_connection()

    def get_config(self) -> dict:
        if self.main_window and hasattr(self.main_window, "config"):
            return self.main_window.config
        return {}

    def is_plc_connected(self) -> bool:
        if self.main_window and hasattr(self.main_window, "plc_client"):
            return getattr(self.main_window.plc_client, "connected", False)
        return True

    def is_camera_active(self) -> bool:
        if self.main_window and hasattr(self.main_window, "camera_thread"):
            return getattr(self.main_window.camera_thread, "running", False)
        return False

    def get_bins_data(self) -> List[Dict[str, Any]]:
        bins = []
        for m in self.bins_meta:
            g_num = m.get("gate_number", 1)
            bid = m.get("id", f"GATE_{g_num}")
            count = self.counters.get(bid, 0)
            if count == 0:
                if g_num == 1: count = self.counters.get("GATE_1", 0)
                elif g_num == 2: count = self.counters.get("GATE_2", 0)
                elif g_num == 3: count = self.counters.get("GATE_3", 0)
                elif g_num == 4: count = self.counters.get("GATE_4", 0)
                elif g_num == 5: count = self.counters.get("GATE_5", 0)
                elif g_num == 99: count = self.counters.get("REJECT", 0)

            cap = m.get("capacity", 100)
            fill_pct = min(100, int((count / max(1, cap)) * 100))
            status = "AVAILABLE"
            if fill_pct >= 90: status = "FULL"
            elif fill_pct == 0: status = "EMPTY"

            bins.append({
                "id": bid,
                "gateNumber": g_num,
                "name": m.get("name", f"Cửa {g_num}"),
                "district": m.get("name", "").split(" - ")[-1] if " - " in m.get("name", "") else m.get("name", ""),
                "productCode": m.get("productCode", f"SKU_{g_num}"),
                "productName": m.get("productName", m.get("name", "")),
                "colorName": m.get("colorHex", "#34C759"),
                "colorHex": m.get("colorHex", "#34C759"),
                "qrKeyword": m.get("qrKeyword", "NONE"),
                "plcSignal": m.get("plcSignal", g_num),
                "quantity": count,
                "current": count,
                "capacity": cap,
                "remaining": max(0, cap - count),
                "fillPercent": fill_pct,
                "status": status,
                "sensorActive": False,
                "busy": False,
                "pusherExtended": False,
            })
        return bins

    async def _broadcast_bins_update(self):
        bins = self.get_bins_data()
        msg_inv = json.dumps({"event": "inventory_updated", "payload": bins}) + "\n"
        snap = self.get_system_snapshot()
        msg_snap = json.dumps({"event": "snapshot", "payload": snap}) + "\n"
        with self._conn_lock:
            conns = list(self.active_connections)
        for ws in conns:
            try:
                await ws.send_text(msg_inv)
                await ws.send_text(msg_snap)
            except Exception:
                pass

    def get_system_snapshot(self) -> dict:
        plc_conn = self.is_plc_connected()
        cfg = self.get_config()
        sim_mode = cfg.get("plc", {}).get("simulation_mode", True)

        machine_status = {
            "plcConnected": plc_conn,
            "plcStatus": "CONNECTED" if plc_conn else "DISCONNECTED",
            "mode": "simulation" if sim_mode else "real",
            "machineMode": "AUTO",
            "machineState": "RUNNING",
            "conveyorRunning": True,
            "emergencyStop": False,
            "realWritesEnabled": True,
            "activeAlarmCount": 0,
            "lastUpdate": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        bins = self.get_bins_data()
        sensors = [
            {"id": "s_infeed", "name": "Cảm biến Cửa Vào (Infeed)", "active": True, "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")},
            {"id": "s_camera", "name": "Cảm biến Vị trí Camera", "active": self.is_camera_active(), "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")},
            {"id": "s_outfeed", "name": "Cảm biến Cửa Ra (Outfeed)", "active": False, "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")},
        ]
        actuators = [
            {"id": f"pusher_{i}", "name": f"Xylanh Gạt Cửa {i}", "state": "RETRACTED", "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")}
            for i in range(1, 6)
        ]
        actuators.append({"id": "pusher_reject", "name": "Xylanh Gạt Cửa Loại", "state": "RETRACTED", "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")})

        return {
            "serverTime": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "plcStatus": "CONNECTED" if plc_conn else "DISCONNECTED",
            "mode": "simulation" if sim_mode else "real",
            "machine": machine_status,
            "conveyorRunning": True,
            "bins": bins,
            "sensors": sensors,
            "actuators": actuators,
            "alarms": [],
            "activeCommands": [],
            "serverUptimeSecs": int(time.time() - self.start_time),
        }

    def start(self):
        """Starts the FastAPI Web Bridge in a background daemon thread"""
        if self.is_running:
            return

        self.is_running = True

        def run_server():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            config = uvicorn.Config(
                app=self.app,
                host=self.host,
                port=self.port,
                loop="asyncio",
                log_level="warning",
            )
            server = uvicorn.Server(config)
            self.loop.run_until_complete(server.serve())

        self.server_thread = threading.Thread(target=run_server, daemon=True)
        self.server_thread.start()
        logger.info(f"WebBridge server started on http://{self.host}:{self.port}")

    def stop(self):
        self.is_running = False

    def push_frame(self, frame: np.ndarray):
        """Called whenever OpenCV processes a new frame with annotations"""
        try:
            _, encoded = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            with self._frame_lock:
                self._latest_jpeg = encoded.tobytes()
        except Exception as e:
            logger.error(f"Error encoding frame: {e}")

    def push_detection(self, scan_payload: dict, counters: dict):
        """Called whenever a product is scanned and classified"""
        self.counters.update(counters)
        
        cls = scan_payload.get("classification", {})
        gate_id = cls.get("gate_id", 99)
        val = cls.get("plc_signal_value", 99)
        rule_name = cls.get("rule_name", f"Cửa {gate_id}")

        self.latest_detection = {
            "qr_data": scan_payload.get("qr_data", "N/A"),
            "color": scan_payload.get("color", "UNKNOWN"),
            "color_confidence": scan_payload.get("color_confidence", 95),
            "gate_id": gate_id,
            "plc_signal_value": val,
            "rule_name": rule_name,
            "timestamp": scan_payload.get("timestamp", time.strftime("%H:%M:%S")),
        }

        # Add to history
        hist_entry = {
            "id": f"rec_{int(time.time() * 1000)}",
            "timestamp": self.latest_detection["timestamp"],
            "qrData": self.latest_detection["qr_data"],
            "color": self.latest_detection["color"],
            "gateName": rule_name,
            "signal": val,
            "status": "REJECTED" if gate_id == 99 else "SUCCESS"
        }
        self.history.insert(0, hist_entry)
        if len(self.history) > 100:
            self.history = self.history[:100]

        # Broadcast detection and bin updates to Web
        self.broadcast_sync("detection", self.latest_detection)
        self.broadcast_sync("inventory_updated", self.get_bins_data())
        self.broadcast_sync("counters", self.counters)

        # Trigger gate diverter on Web HMI
        bin_id = f"GATE_{gate_id}" if gate_id in [1, 2, 3, 4, 5] else "GATE_REJECT"
        self.broadcast_sync("bin_updated", {
            "id": bin_id,
            "gate_id": gate_id,
            "quantity": self.counters.get(f"GATE_{gate_id}" if gate_id != 99 else "REJECT", 0),
            "busy": True,
            "pusherExtended": True
        })

    def push_log(self, text: str, level: str = "INFO"):
        """Called whenever a log message is generated"""
        log_entry = {
            "id": f"log_{int(time.time() * 1000)}",
            "timestamp": time.strftime("%H:%M:%S"),
            "type": level.lower(),
            "level": level,
            "message": text
        }
        self.logs.insert(0, log_entry)
        if len(self.logs) > 150:
            self.logs = self.logs[:150]

        self.broadcast_sync("log", log_entry)

    def push_plc_status(self, connected: bool, status_str: str):
        self.broadcast_sync("plc_status", {
            "connected": connected,
            "status": status_str
        })

    def trigger_gate(self, gate_id: int) -> bool:
        """Triggers gate signal on PLC through the Python Modbus client"""
        val = gate_id
        if self.main_window:
            try:
                # If MainWindow has plc_client, write register
                reg_addr = self.main_window.config.get("plc", {}).get("register_address", 0)
                success = self.main_window.plc_client.write_register(reg_addr, val)
                
                # Update counters
                if gate_id == 1: self.counters["GATE_1"] += 1
                elif gate_id == 2: self.counters["GATE_2"] += 1
                elif gate_id == 3: self.counters["GATE_3"] += 1
                elif gate_id == 4: self.counters["GATE_4"] += 1
                elif gate_id == 5: self.counters["GATE_5"] += 1
                else: self.counters["REJECT"] += 1
                self.counters["TOTAL"] += 1

                # Update main_window counters if available
                if hasattr(self.main_window, "counters"):
                    self.main_window.counters.update(self.counters)
                    if hasattr(self.main_window, "lbl_cnt_total"):
                        # Thread-safe UI update
                        self.main_window.lbl_cnt_total.setText(str(self.counters["TOTAL"]))

                self.push_log(f"[Thủ công từ Web HMI] Kích hoạt Cửa {gate_id} (Signal {val}) -> PLC", "INFO")
                self.broadcast_sync("inventory_updated", self.get_bins_data())
                self.broadcast_sync("counters", self.counters)
                return success
            except Exception as e:
                logger.error(f"Error triggering gate {gate_id}: {e}")
                return False
        return True

    def do_reset_counters(self):
        for k in self.counters:
            self.counters[k] = 0
        self.history = []
        if self.main_window and hasattr(self.main_window, "reset_counters"):
            try:
                self.main_window.reset_counters()
            except Exception:
                pass
        self.push_log("Đã reset toàn bộ bộ đếm từ Web HMI.", "INFO")
        self.broadcast_sync("counters", self.counters)
        self.broadcast_sync("inventory_updated", self.get_bins_data())

    def broadcast_sync(self, event: str, payload: Any):
        """Thread-safe broadcast helper to all connected WebSockets"""
        if not self.loop or not self.loop.is_running() or not self.active_connections:
            return

        async def _broadcast():
            msg = json.dumps({"event": event, "payload": payload}) + "\n"
            with self._conn_lock:
                conns = list(self.active_connections)
            for ws in conns:
                try:
                    await ws.send_text(msg)
                except Exception:
                    pass

        asyncio.run_coroutine_threadsafe(_broadcast(), self.loop)
