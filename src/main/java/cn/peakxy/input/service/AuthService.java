package cn.peakxy.input.service;

import cn.peakxy.input.controller.dto.AuthResponse;
import cn.peakxy.input.controller.dto.LoginRequest;
import cn.peakxy.input.controller.dto.RegisterRequest;
import cn.peakxy.input.domain.UserAccount;
import cn.peakxy.input.event.UserAuthenticatedEvent;
import cn.peakxy.input.mapper.UserMapper;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final ApplicationEventPublisher eventPublisher;

    public AuthService(UserMapper userMapper,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       ApplicationEventPublisher eventPublisher) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = normalizeUsername(request.username());
        if (userMapper.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        UserAccount user = new UserAccount(username, passwordEncoder.encode(request.password()));
        userMapper.insert(user);
        eventPublisher.publishEvent(new UserAuthenticatedEvent(user.getId()));
        return new AuthResponse(user.getId(), user.getUsername(), jwtService.generateToken(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String username = normalizeUsername(request.username());
        UserAccount user = userMapper.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        eventPublisher.publishEvent(new UserAuthenticatedEvent(user.getId()));
        return new AuthResponse(user.getId(), user.getUsername(), jwtService.generateToken(user));
    }

    @Cacheable(cacheNames = "userById", key = "#userId")
    @Transactional(readOnly = true)
    public UserAccount requireUserById(Long userId) {
        return userMapper.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim();
    }
}
