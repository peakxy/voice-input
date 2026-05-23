package cn.peakxy.input.service;

import cn.peakxy.input.controller.dto.AuthResponse;
import cn.peakxy.input.controller.dto.LoginRequest;
import cn.peakxy.input.controller.dto.RegisterRequest;
import cn.peakxy.input.domain.UserAccount;
import cn.peakxy.input.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String username = normalizeUsername(request.username());
        if (userRepository.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        UserAccount user = userRepository.save(new UserAccount(username, passwordEncoder.encode(request.password())));
        return new AuthResponse(user.getId(), user.getUsername(), jwtService.generateToken(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String username = normalizeUsername(request.username());
        UserAccount user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
        return new AuthResponse(user.getId(), user.getUsername(), jwtService.generateToken(user));
    }

    @Transactional(readOnly = true)
    public UserAccount requireUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim();
    }
}
