package cn.peakxy.input.controller.dto;

public record WebSocketServerMessage(String type, String sessionId, String text, String message) {
}
