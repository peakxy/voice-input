package cn.peakxy.input.controller.dto;

public record WebSocketClientMessage(String type, String sessionId, String hotwordGroup) {
}
