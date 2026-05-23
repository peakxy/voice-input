package cn.peakxy.input.controller;

import cn.peakxy.input.controller.dto.HotwordRequest;
import cn.peakxy.input.controller.dto.HotwordResponse;
import cn.peakxy.input.domain.CurrentUser;
import cn.peakxy.input.service.HotwordService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/hotwords")
public class HotwordController {

    private final HotwordService hotwordService;

    public HotwordController(HotwordService hotwordService) {
        this.hotwordService = hotwordService;
    }

    @GetMapping
    public List<HotwordResponse> list(Authentication authentication) {
        return hotwordService.list(currentUser(authentication).id());
    }

    @PostMapping
    public HotwordResponse create(Authentication authentication, @Valid @RequestBody HotwordRequest request) {
        return hotwordService.create(currentUser(authentication).id(), request);
    }

    @DeleteMapping("/{id}")
    public void delete(Authentication authentication, @PathVariable Long id) {
        hotwordService.delete(currentUser(authentication).id(), id);
    }

    private CurrentUser currentUser(Authentication authentication) {
        return (CurrentUser) authentication.getPrincipal();
    }
}
