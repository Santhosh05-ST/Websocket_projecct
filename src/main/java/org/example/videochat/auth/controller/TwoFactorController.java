package org.example.videochat.auth.controller;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.example.videochat.auth.dto.TwoFactorSetupResponse;
import org.example.videochat.auth.service.TwoFactorService;
import org.example.videochat.user.entity.User;
import org.example.videochat.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;


import java.util.Map;

@RestController
@RequestMapping("/api/2fa")
public class TwoFactorController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TwoFactorService twoFactorService; // Inject missing service

    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    // Usage example:
    public String generateSecret() {
        final GoogleAuthenticatorKey key = gAuth.createCredentials();
        return key.getKey();
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupTwoFactor(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User is not authenticated");
        }

        String email;
        if (authentication.getPrincipal() instanceof OAuth2User oauth2User) {
            email = oauth2User.getAttribute("email");
        } else {
            email = authentication.getName();
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        String secret = twoFactorService.generateNewSecret();
        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        String qrCodeUri = twoFactorService.generateQrCodeUri(secret, user.getEmail());

        return ResponseEntity.ok(new TwoFactorSetupResponse(secret, qrCodeUri));
    }

    // 2. Verify Code & Enable 2FA
    @PostMapping("/verify")
    public ResponseEntity<?> verify2FA(@AuthenticationPrincipal User user, @RequestBody Map<String, Integer> payload) {
        int code = payload.get("code");
        boolean isCodeValid = gAuth.authorize(user.getTwoFactorSecret(), code);

        if (isCodeValid) {
            user.setIsTwoFactorEnabled(true);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "2FA enabled successfully"));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid 2FA code");
    }

}

