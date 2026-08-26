package org.example.videochat.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TwoFactorSetupResponse {
    private String secret;
    private String qrCodeUri;
}