import json
from fastapi import WebSocket
from starlette.websockets import WebSocketState
from typing import Dict


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, interview_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[interview_id] = websocket

    def disconnect(self, interview_id: str):
        self.active_connections.pop(interview_id, None)

    async def send_personal(self, interview_id: str, message: dict):
        ws = self.active_connections.get(interview_id)
        if ws and ws.client_state == WebSocketState.CONNECTED:
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False, default=str))
            except Exception:
                self.disconnect(interview_id)

    async def send_stream_chunk(self, interview_id: str, event_type: str, delta: str):
        await self.send_personal(interview_id, {"type": event_type, "data": {"delta": delta}})

    def is_connected(self, interview_id: str) -> bool:
        ws = self.active_connections.get(interview_id)
        return ws is not None and ws.client_state == WebSocketState.CONNECTED


manager = ConnectionManager()
