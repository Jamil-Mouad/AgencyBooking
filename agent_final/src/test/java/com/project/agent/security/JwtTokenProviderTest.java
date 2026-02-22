package com.project.agent.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.lang.reflect.Field;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import com.project.agent.model.Users;
import com.project.agent.model.Users.Role;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    // A valid Base64-encoded 256-bit secret for HS256
    private static final String TEST_SECRET = "746573742D6F6E6C792D64756D6D792D7365637265742D666F722D756E6974";
    private static final int TEST_EXPIRATION_MS = 86400000; // 24 hours
    private static final int TEST_REFRESH_EXPIRATION_MS = 604800000; // 7 days

    @BeforeEach
    void setUp() throws Exception {
        jwtTokenProvider = new JwtTokenProvider();

        // Use reflection to set private @Value fields since we are not loading a Spring context
        setField(jwtTokenProvider, "jwtSecret", TEST_SECRET);
        setField(jwtTokenProvider, "jwtExpirationInMs", TEST_EXPIRATION_MS);
        setField(jwtTokenProvider, "refreshTokenExpirationInMs", TEST_REFRESH_EXPIRATION_MS);
    }

    /**
     * Helper pour definir les champs prives via reflection.
     */
    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    /**
     * Helper pour obtenir la cle de signature (replique la logique interne).
     */
    private Key getTestSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(TEST_SECRET);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // =========================================================================
    // Tests pour generateToken
    // =========================================================================
    @Nested
    @DisplayName("Tests pour generateToken")
    class GenerateTokenTests {

        @Test
        @DisplayName("Genere un token valide a partir de l'authentification")
        void generateToken_CreatesValidToken() {
            // Arrange
            Users user = new Users();
            user.setId(1L);
            user.setUsername("testuser");
            user.setEmail("test@example.com");
            user.setPassword("encodedPassword");
            user.setRole(Role.USER);

            Authentication authentication = mock(Authentication.class);
            when(authentication.getPrincipal()).thenReturn(user);

            // Act
            String token = jwtTokenProvider.generateToken(authentication);

            // Assert
            assertNotNull(token, "Le token genere ne doit pas etre null");
            assertFalse(token.isEmpty(), "Le token genere ne doit pas etre vide");

            // Verify the token is valid
            assertTrue(jwtTokenProvider.validateToken(token),
                    "Le token genere doit etre valide");

            // Verify the email can be extracted
            String extractedEmail = jwtTokenProvider.getEmailFromJWT(token);
            assertEquals("test@example.com", extractedEmail,
                    "L'email extrait du token doit correspondre");
        }

        @Test
        @DisplayName("Genere un token a partir de l'email directement")
        void generateTokenFromEmail_CreatesValidToken() {
            // Act
            String token = jwtTokenProvider.generateTokenFromEmail("user@example.com");

            // Assert
            assertNotNull(token, "Le token genere ne doit pas etre null");
            assertTrue(jwtTokenProvider.validateToken(token),
                    "Le token genere doit etre valide");
            assertEquals("user@example.com", jwtTokenProvider.getEmailFromJWT(token),
                    "L'email extrait doit correspondre a l'email utilise pour la generation");
        }

        @Test
        @DisplayName("Genere un refresh token valide")
        void generateRefreshToken_CreatesValidToken() {
            // Act
            String refreshToken = jwtTokenProvider.generateRefreshToken("test@example.com");

            // Assert
            assertNotNull(refreshToken, "Le refresh token ne doit pas etre null");
            assertFalse(refreshToken.isEmpty(), "Le refresh token ne doit pas etre vide");
            assertTrue(jwtTokenProvider.validateToken(refreshToken),
                    "Le refresh token doit etre valide");
            assertEquals("test@example.com", jwtTokenProvider.getEmailFromJWT(refreshToken),
                    "L'email extrait du refresh token doit correspondre");
        }
    }

    // =========================================================================
    // Tests pour getEmailFromJWT (getEmailFromToken)
    // =========================================================================
    @Nested
    @DisplayName("Tests pour getEmailFromJWT")
    class GetEmailFromTokenTests {

        @Test
        @DisplayName("Extrait correctement l'email du token")
        void getEmailFromJWT_ExtractsCorrectEmail() {
            // Arrange
            String email = "extract-test@example.com";
            String token = jwtTokenProvider.generateTokenFromEmail(email);

            // Act
            String extractedEmail = jwtTokenProvider.getEmailFromJWT(token);

            // Assert
            assertEquals(email, extractedEmail,
                    "L'email extrait doit correspondre exactement a celui encode dans le token");
        }

        @Test
        @DisplayName("Extrait l'email d'un refresh token")
        void getEmailFromJWT_FromRefreshToken_ExtractsCorrectEmail() {
            // Arrange
            String email = "refresh-test@example.com";
            String refreshToken = jwtTokenProvider.generateRefreshToken(email);

            // Act
            String extractedEmail = jwtTokenProvider.getEmailFromJWT(refreshToken);

            // Assert
            assertEquals(email, extractedEmail,
                    "L'email extrait du refresh token doit correspondre");
        }

        @Test
        @DisplayName("Extrait correctement des emails avec des caracteres speciaux")
        void getEmailFromJWT_SpecialCharacters_ExtractsCorrectly() {
            // Arrange
            String email = "user+tag@sub.example.com";
            String token = jwtTokenProvider.generateTokenFromEmail(email);

            // Act
            String extractedEmail = jwtTokenProvider.getEmailFromJWT(token);

            // Assert
            assertEquals(email, extractedEmail,
                    "L'email avec des caracteres speciaux doit etre extrait correctement");
        }
    }

    // =========================================================================
    // Tests pour validateToken
    // =========================================================================
    @Nested
    @DisplayName("Tests pour validateToken")
    class ValidateTokenTests {

        @Test
        @DisplayName("Un token valide retourne true")
        void validateToken_ValidToken_ReturnsTrue() {
            // Arrange
            String token = jwtTokenProvider.generateTokenFromEmail("valid@example.com");

            // Act
            boolean result = jwtTokenProvider.validateToken(token);

            // Assert
            assertTrue(result, "Un token valide doit retourner true");
        }

        @Test
        @DisplayName("Un token expire retourne false")
        void validateToken_ExpiredToken_ReturnsFalse() {
            // Arrange - Create a token that is already expired
            Date now = new Date();
            Date expiredDate = new Date(now.getTime() - 1000); // Expired 1 second ago

            String expiredToken = Jwts.builder()
                    .setSubject("expired@example.com")
                    .setIssuedAt(new Date(now.getTime() - 10000))
                    .setExpiration(expiredDate)
                    .signWith(getTestSigningKey(), SignatureAlgorithm.HS256)
                    .compact();

            // Act
            boolean result = jwtTokenProvider.validateToken(expiredToken);

            // Assert
            assertFalse(result, "Un token expire doit retourner false");
        }

        @Test
        @DisplayName("Un token mal forme retourne false")
        void validateToken_MalformedToken_ReturnsFalse() {
            // Arrange
            String malformedToken = "this.is.not.a.valid.jwt.token";

            // Act
            boolean result = jwtTokenProvider.validateToken(malformedToken);

            // Assert
            assertFalse(result, "Un token mal forme doit retourner false");
        }

        @Test
        @DisplayName("Un token avec une signature invalide retourne false")
        void validateToken_InvalidSignature_ReturnsFalse() {
            // Arrange - Create a token signed with a different key
            String differentSecret = "7638792F423F4528482B4D6251655368566D597133743677397A244326462948";
            byte[] differentKeyBytes = Decoders.BASE64.decode(differentSecret);
            Key differentKey = Keys.hmacShaKeyFor(differentKeyBytes);

            String tokenWithDifferentKey = Jwts.builder()
                    .setSubject("hacker@example.com")
                    .setIssuedAt(new Date())
                    .setExpiration(new Date(System.currentTimeMillis() + 86400000))
                    .signWith(differentKey, SignatureAlgorithm.HS256)
                    .compact();

            // Act
            boolean result = jwtTokenProvider.validateToken(tokenWithDifferentKey);

            // Assert
            assertFalse(result, "Un token avec une signature invalide doit retourner false");
        }

        @Test
        @DisplayName("Un token vide retourne false")
        void validateToken_EmptyToken_ReturnsFalse() {
            // Act
            boolean result = jwtTokenProvider.validateToken("");

            // Assert
            assertFalse(result, "Un token vide doit retourner false");
        }

        @Test
        @DisplayName("Un token null retourne false")
        void validateToken_NullToken_ReturnsFalse() {
            // Act
            boolean result = jwtTokenProvider.validateToken(null);

            // Assert
            assertFalse(result, "Un token null doit retourner false");
        }
    }

    // =========================================================================
    // Tests pour getExpirationTime
    // =========================================================================
    @Nested
    @DisplayName("Tests pour getExpirationTime")
    class GetExpirationTimeTests {

        @Test
        @DisplayName("Retourne le temps d'expiration configure")
        void getExpirationTime_ReturnsConfiguredValue() {
            // Act
            long expirationTime = jwtTokenProvider.getExpirationTime();

            // Assert
            assertEquals(TEST_EXPIRATION_MS, expirationTime,
                    "Le temps d'expiration doit correspondre a la valeur configuree");
        }
    }
}
