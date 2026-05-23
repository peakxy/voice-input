package cn.peakxy.input.controller;

import cn.peakxy.input.controller.dto.HotwordSeedResponse;
import cn.peakxy.input.controller.dto.ImportSeedRequest;
import cn.peakxy.input.controller.dto.ImportSeedResponse;
import cn.peakxy.input.domain.CurrentUser;
import cn.peakxy.input.domain.HotwordSeed;
import cn.peakxy.input.service.HotwordSeedService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class HotwordSeedController {

    private final HotwordSeedService seedService;

    public HotwordSeedController(HotwordSeedService seedService) {
        this.seedService = seedService;
    }

    @GetMapping("/api/hotword-seeds")
    public List<HotwordSeedResponse> list(@RequestParam(name = "group", required = false) String group,
                                          @RequestParam(name = "limit", defaultValue = "50") int limit) {
        String groupName = group == null || group.isBlank() ? defaultGroup() : group;
        int safeLimit = Math.max(1, Math.min(limit, 200));
        return seedService.findTopByGroup(groupName, safeLimit)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/api/hotwords/import-seeds")
    public ImportSeedResponse importSeeds(Authentication authentication,
                                          @Valid @RequestBody ImportSeedRequest request) {
        CurrentUser user = (CurrentUser) authentication.getPrincipal();
        String groupName = request.groupName() == null || request.groupName().isBlank()
                ? defaultGroup() : request.groupName().trim();
        int top = request.top() == null || request.top() <= 0 ? 50 : Math.min(request.top(), 200);
        int inserted = seedService.importTopForUser(user.id(), groupName, top);
        return new ImportSeedResponse(inserted);
    }

    private HotwordSeedResponse toResponse(HotwordSeed seed) {
        return new HotwordSeedResponse(seed.getId(), seed.getWord(), seed.getGroupName(), seed.getSource(), seed.getScore());
    }

    private String defaultGroup() {
        return "通用";
    }
}
