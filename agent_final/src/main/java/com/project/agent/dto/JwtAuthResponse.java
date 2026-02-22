package com.project.agent.dto;

import lombok.Data;

@Data
public class JwtAuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private Long expiresIn;
    private String refreshToken;
    private String email;
    private String username;
    private String role;

    public JwtAuthResponse(String accessToken, String refreshToken, Long expiresIn, 
                          String email, String username, String role) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.email = email;
        this.username = username;
        this.role = role;
    }
}