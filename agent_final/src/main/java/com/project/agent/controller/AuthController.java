package com.project.agent.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.JwtAuthResponse;
import com.project.agent.dto.LoginRequest;
import com.project.agent.dto.NewPasswordRequest;
import com.project.agent.dto.PasswordResetRequest;
import com.project.agent.dto.RefreshTokenRequest;
import com.project.agent.dto.RegisterRequest;
import com.project.agent.dto.VerifyCodeRequest;
import com.project.agent.model.Users;
import com.project.agent.security.JwtTokenProvider;
import com.project.agent.service.PasswordResetService;
import com.project.agent.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            logger.info("Tentative de connexion pour: {}", loginRequest.getEmail());
            
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            String accessToken = tokenProvider.generateToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(loginRequest.getEmail());
            
            Users user = (Users) authentication.getPrincipal();
            
            JwtAuthResponse response = new JwtAuthResponse(
                    accessToken,
                    refreshToken,
                    tokenProvider.getExpirationTime(),
                    user.getEmail(),
                    user.getDisplayName(),
                    user.getRole().toString()
            );

            logger.info("Connexion réussie pour: {}", loginRequest.getEmail());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Échec de connexion pour {}: {}", loginRequest.getEmail(), e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ApiResponse("Email ou mot de passe incorrect", false));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@Valid @RequestBody RefreshTokenRequest refreshRequest) {
        try {
            String refreshToken = refreshRequest.getRefreshToken();
            
            if (tokenProvider.validateToken(refreshToken)) {
                String email = tokenProvider.getEmailFromJWT(refreshToken);
                String newAccessToken = tokenProvider.generateTokenFromEmail(email);
                String newRefreshToken = tokenProvider.generateRefreshToken(email);
                
                Users user = userService.findByEmail(email)
                        .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
                
                JwtAuthResponse response = new JwtAuthResponse(
                        newAccessToken,
                        newRefreshToken,
                        tokenProvider.getExpirationTime(),
                        user.getEmail(),
                        user.getDisplayName(),
                        user.getRole().toString()
                );

                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.badRequest()
                        .body(new ApiResponse("Refresh token invalide", false));
            }
        } catch (Exception e) {
            logger.error("Erreur lors du rafraîchissement du token: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ApiResponse("Erreur lors du rafraîchissement du token", false));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> initiateRegistration(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            userService.initiateRegistration(registerRequest);
            return ResponseEntity.ok(new ApiResponse("Un code de vérification a été envoyé à votre adresse email", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse> verifyEmail(@Valid @RequestBody VerifyCodeRequest verifyRequest) {
        try {
            Users user = userService.completeRegistration(verifyRequest);
            return ResponseEntity.ok(new ApiResponse("Compte créé avec succès. Vous pouvez maintenant vous connecter.", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<ApiResponse> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        try {
            passwordResetService.initiatePasswordReset(request.getEmail());
            return ResponseEntity.ok(new ApiResponse("Un code de vérification a été envoyé à votre adresse email", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    @PostMapping("/password-reset/verify-code")
    public ResponseEntity<ApiResponse> verifyCode(@Valid @RequestBody VerifyCodeRequest request) {
        try {
            boolean isValid = passwordResetService.verifyCode(request.getEmail(), request.getCode());
            if (isValid) {
                return ResponseEntity.ok(new ApiResponse("Code de vérification valide", true));
            } else {
                return ResponseEntity.badRequest().body(new ApiResponse("Code de vérification invalide", false));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    @PostMapping("/password-reset/new-password")
    public ResponseEntity<ApiResponse> resetPassword(@Valid @RequestBody NewPasswordRequest request) {
        try {
            if (!request.getNewPassword().equals(request.getConfirmPassword())) {
                return ResponseEntity.badRequest().body(new ApiResponse("Les mots de passe ne correspondent pas", false));
            }
            
            passwordResetService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
            return ResponseEntity.ok(new ApiResponse("Mot de passe réinitialisé avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    @GetMapping("/check-auth")
    public ResponseEntity<?> checkAuthentication(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                
                if (tokenProvider.validateToken(token)) {
                    String email = tokenProvider.getEmailFromJWT(token);
                    Users user = userService.findByEmail(email)
                            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
                    
                    return ResponseEntity.ok(new ApiResponse(
                            email + "|" + user.getRole() + "|" + user.getUsername(), 
                            true
                    ));
                }
            }
            
            return ResponseEntity.ok(new ApiResponse("Non authentifié", false));
        } catch (Exception e) {
            return ResponseEntity.ok(new ApiResponse("Non authentifié", false));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse> logout() {
        // Avec JWT, le logout est géré côté client en supprimant le token
        return ResponseEntity.ok(new ApiResponse("Déconnexion réussie", true));
    }
}