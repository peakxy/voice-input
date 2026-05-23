package cn.peakxy.input.controller.dto;

public record HotwordSeedResponse(Long id, String word, String groupName, String source, Integer score) {
}
