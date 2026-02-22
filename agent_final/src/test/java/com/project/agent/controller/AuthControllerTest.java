package com.project.agent.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.agent.configuration.SecurityConfig;
import com.project.agent.dto.LoginRequest;
import com.project.agent.dto.RegisterRequest;
import com.project.agent.model.Users;
import com.project.agent.model.Users.Role;
import com.project.agent.security.JwtAuthenticationEntryPoint;
import com.project.agent.security.JwtAuthenticationFilter;
import com.project.agent.security.JwtTokenProvider;
import com.project.agent.service.PasswordResetService;
import com.project.agent.service.UserService;

@WebMvcTest(
    controllers = AuthController.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.ASSIGNABLE_TYPE,
        classes = {SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class}
    )
)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private PasswordResetService passwordResetService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    private Users testUser;

    @BeforeEach
    void setUp() {
        testUser = new Users();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setRole(Role.USER);
    }

    // =========================================================================
    // Tests pour POST /auth/login
    // =========================================================================
    @Nested
    @DisplayName("Tests pour POST /auth/login")
    class LoginTests {

        @Test
        @DisplayName("Connexion reussie retourne un JWT")
        void login_Success_ReturnsJwt() throws Exception {
            // Arrange
            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setEmail("test@example.com");
            loginRequest.setPassword("password123");

            Authentication authentication = mock(Authentication.class);
            when(authentication.getPrincipal()).thenReturn(testUser);
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(authentication);
            when(tokenProvider.generateToken(authentication)).thenReturn("test-jwt-access-token");
            when(tokenProvider.generateRefreshToken("test@example.com")).thenReturn("test-jwt-refresh-token");
            when(tokenProvider.getExpirationTime()).thenReturn(86400000L);

            // Act & Assert
            mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.accessToken").value("test-jwt-access-token"))
                    .andExpect(jsonPath("$.refreshToken").value("test-jwt-refresh-token"))
                    .andExpect(jsonPath("$.email").value("test@example.com"))
                    .andExpect(jsonPath("$.username").value("testuser"))
                    .andExpect(jsonPath("$.role").value("USER"))
                    .andExpect(jsonPath("$.expiresIn").value(86400000));

            verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        }

        @Test
        @DisplayName("Connexion echouee avec des identifiants incorrects retourne 400")
        void login_BadCredentials_ReturnsBadRequest() throws Exception {
            // Arrange
            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setEmail("test@example.com");
            loginRequest.setPassword("wrongpassword");

            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            // Act & Assert
            mockMvc.perform(post("/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Email ou mot de passe incorrect"));
        }
    }

    // =========================================================================
    // Tests pour POST /auth/register
    // =========================================================================
    @Nested
    @DisplayName("Tests pour POST /auth/register")
    class RegisterTests {

        @Test
        @DisplayName("Inscription reussie retourne un message de succes")
        void register_Success_ReturnsOk() throws Exception {
            // Arrange
            RegisterRequest registerRequest = new RegisterRequest();
            registerRequest.setUsername("newuser");
            registerRequest.setEmail("new@example.com");
            registerRequest.setPassword("password123");
            registerRequest.setPasswordConfirm("password123");

            doNothing().when(userService).initiateRegistration(any(RegisterRequest.class));

            // Act & Assert
            mockMvc.perform(post("/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(registerRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(
                            "Un code de v\u00e9rification a \u00e9t\u00e9 envoy\u00e9 \u00e0 votre adresse email"));

            verify(userService).initiateRegistration(any(RegisterRequest.class));
        }

        @Test
        @DisplayName("Inscription echouee avec email duplique retourne une erreur")
        void register_DuplicateEmail_ReturnsBadRequest() throws Exception {
            // Arrange
            RegisterRequest registerRequest = new RegisterRequest();
            registerRequest.setUsername("newuser");
            registerRequest.setEmail("existing@example.com");
            registerRequest.setPassword("password123");
            registerRequest.setPasswordConfirm("password123");

            doThrow(new RuntimeException("Cet email est d\u00e9j\u00e0 utilis\u00e9"))
                    .when(userService).initiateRegistration(any(RegisterRequest.class));

            // Act & Assert
            mockMvc.perform(post("/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(registerRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Cet email est d\u00e9j\u00e0 utilis\u00e9"));
        }

        @Test
        @DisplayName("Inscription echouee avec mots de passe differents retourne une erreur")
        void register_PasswordMismatch_ReturnsBadRequest() throws Exception {
            // Arrange
            RegisterRequest registerRequest = new RegisterRequest();
            registerRequest.setUsername("newuser");
            registerRequest.setEmail("new@example.com");
            registerRequest.setPassword("password123");
            registerRequest.setPasswordConfirm("password123");

            doThrow(new RuntimeException("Les mots de passe ne correspondent pas"))
                    .when(userService).initiateRegistration(any(RegisterRequest.class));

            // Act & Assert
            mockMvc.perform(post("/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(registerRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Les mots de passe ne correspondent pas"));
        }
    }

    // =========================================================================
    // Tests pour GET /auth/check-auth
    // =========================================================================
    @Nested
    @DisplayName("Tests pour GET /auth/check-auth")
    class CheckAuthTests {

        @Test
        @DisplayName("Verification d'authentification avec un token valide retourne les informations utilisateur")
        void checkAuth_ValidToken_ReturnsUserInfo() throws Exception {
            // Arrange
            when(tokenProvider.validateToken("valid-token")).thenReturn(true);
            when(tokenProvider.getEmailFromJWT("valid-token")).thenReturn("test@example.com");
            when(userService.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

            // Act & Assert
            mockMvc.perform(get("/auth/check-auth")
                            .header("Authorization", "Bearer valid-token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("test@example.com|USER|test@example.com"));
        }

        @Test
        @DisplayName("Verification d'authentification sans token retourne non authentifie")
        void checkAuth_NoToken_ReturnsNotAuthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/auth/check-auth"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Non authentifi\u00e9"));
        }

        @Test
        @DisplayName("Verification d'authentification avec un token invalide retourne non authentifie")
        void checkAuth_InvalidToken_ReturnsNotAuthenticated() throws Exception {
            // Arrange
            when(tokenProvider.validateToken("invalid-token")).thenReturn(false);

            // Act & Assert
            mockMvc.perform(get("/auth/check-auth")
                            .header("Authorization", "Bearer invalid-token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Non authentifi\u00e9"));
        }

        @Test
        @DisplayName("Verification d'authentification avec header Authorization mal forme retourne non authentifie")
        void checkAuth_MalformedHeader_ReturnsNotAuthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/auth/check-auth")
                            .header("Authorization", "NotBearer some-token"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Non authentifi\u00e9"));
        }
    }
}
