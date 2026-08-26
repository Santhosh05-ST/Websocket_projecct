package org.example.videochat.auth.service;

import org.springframework.stereotype.Service;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class TwoFactorService {

    public String generateNewSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[20];
        random.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    public String generateQrCodeUri(String secret, String email) {
        String appName = "VideoChat";
        return String.format(
                "otpauth://totp/%s:%s?secret=%s&issuer=%s",
                appName, email, secret, appName
        );
    }
}