package org.example.videochat.auth.controller;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import org.example.videochat.user.entity.User;
import org.example.videochat.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/2fa")
public class TwoFactorController {

    private final UserRepository userRepository;
    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    @Autowired
    public TwoFactorController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 1. Generate 2FA Secret & QR Code URL
    @PostMapping("/setup")
    public ResponseEntity<?> setup2FA(@AuthenticationPrincipal User user) {
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        String secret = key.getKey();

        // Save secret temporarily or permanently to user
        user.setTwoFactorSecret(secret);
        userRepository.save(user);

        String qrCodeUrl = GoogleAuthenticatorQRGenerator.getOtpAuthURL("YourApp", user.getEmail(), key);
        return ResponseEntity.ok(Map.of("secret", secret, "qrCodeUrl", qrCodeUrl));
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
