package cn.peakxy.input.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HotwordRequest(
        @NotBlank @Size(max = 32) String groupName,
        @NotBlank @Size(max = 255) String word
) {
}
