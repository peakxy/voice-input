package cn.peakxy.input.controller;

import cn.peakxy.input.controller.dto.TranscriptResponse;
import cn.peakxy.input.domain.CurrentUser;
import cn.peakxy.input.service.TranscriptService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/transcripts")
public class TranscriptController {

    private final TranscriptService transcriptService;

    public TranscriptController(TranscriptService transcriptService) {
        this.transcriptService = transcriptService;
    }

    @GetMapping
    public List<TranscriptResponse> list(Authentication authentication) {
        CurrentUser currentUser = (CurrentUser) authentication.getPrincipal();
        return transcriptService.list(currentUser.id());
    }
}
