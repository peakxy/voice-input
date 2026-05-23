package cn.peakxy.input.controller;

import cn.peakxy.input.controller.dto.MeResponse;
import cn.peakxy.input.domain.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ProfileController {

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        CurrentUser currentUser = (CurrentUser) authentication.getPrincipal();
        return new MeResponse(currentUser.id(), currentUser.username());
    }
}
