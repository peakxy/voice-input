package cn.peakxy.input.event;

public record ProviderHealthEvent(String providerName, String message, Throwable cause) {
}
