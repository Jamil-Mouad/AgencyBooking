package com.project.agent.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.project.agent.dto.RegisterRequest;
import com.project.agent.dto.VerifyCodeRequest;
import com.project.agent.model.PendingUser;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.model.Users.Role;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.PendingUserRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;
import com.project.agent.repository.VerificationCodeRepository;

import jakarta.persistence.EntityManager;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PendingUserRepository pendingUserRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private AgencyRepository agencyRepository;

    @Mock
    private EntityManager entityManager;

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private VerificationCodeRepository verificationCodeRepository;

    @InjectMocks
    private UserService userService;

    private RegisterRequest registerRequest;
    private Users testUser;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");
        registerRequest.setPasswordConfirm("password123");

        testUser = new Users();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setRole(Role.USER);
    }

    // =========================================================================
    // Tests pour initiateRegistration
    // =========================================================================
    @Nested
    @DisplayName("Tests pour initiateRegistration")
    class InitiateRegistrationTests {

        @Test
        @DisplayName("Inscription initiee avec succes - code de verification envoye")
        void initiateRegistration_Success() {
            // Arrange
            when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
            when(pendingUserRepository.findByEmail("test@example.com")).thenReturn(Optional.empty());
            when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
            when(pendingUserRepository.save(any(PendingUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            assertDoesNotThrow(() -> userService.initiateRegistration(registerRequest));

            // Assert
            ArgumentCaptor<PendingUser> pendingUserCaptor = ArgumentCaptor.forClass(PendingUser.class);
            verify(pendingUserRepository).save(pendingUserCaptor.capture());

            PendingUser savedPendingUser = pendingUserCaptor.getValue();
            assertEquals("testuser", savedPendingUser.getUsername(),
                    "Le nom d'utilisateur doit correspondre");
            assertEquals("test@example.com", savedPendingUser.getEmail(),
                    "L'email doit correspondre");
            assertEquals("encodedPassword", savedPendingUser.getPassword(),
                    "Le mot de passe doit etre encode");
            assertNotNull(savedPendingUser.getVerificationCode(),
                    "Le code de verification ne doit pas etre null");
            assertEquals(6, savedPendingUser.getVerificationCode().length(),
                    "Le code de verification doit avoir 6 chiffres");
            assertNotNull(savedPendingUser.getCreatedAt(),
                    "La date de creation doit etre definie");
            assertNotNull(savedPendingUser.getExpiresAt(),
                    "La date d'expiration doit etre definie");

            verify(emailService).sendRegistrationVerificationCode(
                    eq("test@example.com"), eq("testuser"), anyString());
        }

        @Test
        @DisplayName("Inscription echoue si l'email est deja utilise")
        void initiateRegistration_DuplicateEmail_ThrowsException() {
            // Arrange
            when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.initiateRegistration(registerRequest),
                    "Une exception doit etre levee pour un email duplique");

            assertEquals("Cet email est d\u00e9j\u00e0 utilis\u00e9", exception.getMessage(),
                    "Le message d'erreur doit indiquer que l'email est deja utilise");

            verify(pendingUserRepository, never()).save(any());
            verify(emailService, never()).sendRegistrationVerificationCode(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("Inscription echoue si les mots de passe ne correspondent pas")
        void initiateRegistration_PasswordMismatch_ThrowsException() {
            // Arrange
            registerRequest.setPasswordConfirm("differentPassword");
            when(userRepository.existsByEmail("test@example.com")).thenReturn(false);

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.initiateRegistration(registerRequest),
                    "Une exception doit etre levee pour des mots de passe differents");

            assertEquals("Les mots de passe ne correspondent pas", exception.getMessage(),
                    "Le message d'erreur doit indiquer que les mots de passe ne correspondent pas");

            verify(pendingUserRepository, never()).save(any());
            verify(emailService, never()).sendRegistrationVerificationCode(anyString(), anyString(), anyString());
        }

        @Test
        @DisplayName("Inscription supprime l'ancienne inscription en attente pour le meme email")
        void initiateRegistration_DeletesPreviousPendingUser() {
            // Arrange
            PendingUser existingPending = new PendingUser();
            existingPending.setEmail("test@example.com");

            when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
            when(pendingUserRepository.findByEmail("test@example.com"))
                    .thenReturn(Optional.of(existingPending));
            when(passwordEncoder.encode("password123")).thenReturn("encodedPassword");
            when(pendingUserRepository.save(any(PendingUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            userService.initiateRegistration(registerRequest);

            // Assert
            verify(pendingUserRepository).delete(existingPending);
            verify(pendingUserRepository).save(any(PendingUser.class));
        }
    }

    // =========================================================================
    // Tests pour completeRegistration
    // =========================================================================
    @Nested
    @DisplayName("Tests pour completeRegistration")
    class CompleteRegistrationTests {

        @Test
        @DisplayName("Inscription completee avec succes apres verification du code")
        void completeRegistration_Success() {
            // Arrange
            VerifyCodeRequest verifyRequest = new VerifyCodeRequest();
            verifyRequest.setEmail("test@example.com");
            verifyRequest.setCode("123456");

            PendingUser pendingUser = new PendingUser();
            pendingUser.setUsername("testuser");
            pendingUser.setEmail("test@example.com");
            pendingUser.setPassword("encodedPassword");
            pendingUser.setVerificationCode("123456");
            pendingUser.setCreatedAt(LocalDateTime.now());
            pendingUser.setExpiresAt(LocalDateTime.now().plusMinutes(15));

            when(pendingUserRepository.findByEmailAndVerificationCode("test@example.com", "123456"))
                    .thenReturn(Optional.of(pendingUser));
            when(userRepository.save(any(Users.class))).thenAnswer(invocation -> {
                Users user = invocation.getArgument(0);
                user.setId(1L);
                return user;
            });

            // Act
            Users result = userService.completeRegistration(verifyRequest);

            // Assert
            assertNotNull(result, "L'utilisateur cree ne doit pas etre null");
            assertEquals("testuser", result.getDisplayName(),
                    "Le nom d'utilisateur doit correspondre");
            assertEquals("test@example.com", result.getEmail(),
                    "L'email doit correspondre");
            assertEquals("encodedPassword", result.getPassword(),
                    "Le mot de passe doit etre celui deja encode");
            assertEquals(Role.USER, result.getRole(),
                    "Le role doit etre USER par defaut");

            verify(pendingUserRepository).delete(pendingUser);
            verify(userRepository).save(any(Users.class));
        }

        @Test
        @DisplayName("Inscription echoue avec un code de verification invalide")
        void completeRegistration_InvalidCode_ThrowsException() {
            // Arrange
            VerifyCodeRequest verifyRequest = new VerifyCodeRequest();
            verifyRequest.setEmail("test@example.com");
            verifyRequest.setCode("000000");

            when(pendingUserRepository.findByEmailAndVerificationCode("test@example.com", "000000"))
                    .thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.completeRegistration(verifyRequest),
                    "Une exception doit etre levee pour un code invalide");

            assertEquals("Code de v\u00e9rification invalide ou email non reconnu",
                    exception.getMessage(),
                    "Le message d'erreur doit indiquer un code invalide");

            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Inscription echoue avec un code de verification expire")
        void completeRegistration_ExpiredCode_ThrowsException() {
            // Arrange
            VerifyCodeRequest verifyRequest = new VerifyCodeRequest();
            verifyRequest.setEmail("test@example.com");
            verifyRequest.setCode("123456");

            PendingUser pendingUser = new PendingUser();
            pendingUser.setUsername("testuser");
            pendingUser.setEmail("test@example.com");
            pendingUser.setPassword("encodedPassword");
            pendingUser.setVerificationCode("123456");
            pendingUser.setCreatedAt(LocalDateTime.now().minusMinutes(20));
            pendingUser.setExpiresAt(LocalDateTime.now().minusMinutes(5)); // Expire il y a 5 minutes

            when(pendingUserRepository.findByEmailAndVerificationCode("test@example.com", "123456"))
                    .thenReturn(Optional.of(pendingUser));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.completeRegistration(verifyRequest),
                    "Une exception doit etre levee pour un code expire");

            assertTrue(exception.getMessage().contains("expir\u00e9"),
                    "Le message d'erreur doit indiquer que le code a expire");

            verify(pendingUserRepository).delete(pendingUser);
            verify(userRepository, never()).save(any());
        }
    }

    // =========================================================================
    // Tests pour changePassword
    // =========================================================================
    @Nested
    @DisplayName("Tests pour changePassword")
    class ChangePasswordTests {

        @Test
        @DisplayName("Changement de mot de passe reussi")
        void changePassword_Success() {
            // Arrange
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
            when(passwordEncoder.encode("newPassword123")).thenReturn("newEncodedPassword");
            when(userRepository.save(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            assertDoesNotThrow(() ->
                    userService.changePassword("test@example.com", "password123", "newPassword123"));

            // Assert
            ArgumentCaptor<Users> userCaptor = ArgumentCaptor.forClass(Users.class);
            verify(userRepository).save(userCaptor.capture());
            assertEquals("newEncodedPassword", userCaptor.getValue().getPassword(),
                    "Le mot de passe doit etre mis a jour avec la nouvelle valeur encodee");
        }

        @Test
        @DisplayName("Changement de mot de passe echoue avec un mot de passe actuel incorrect")
        void changePassword_WrongCurrentPassword_ThrowsException() {
            // Arrange
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.changePassword("test@example.com", "wrongPassword", "newPassword123"),
                    "Une exception doit etre levee pour un mot de passe actuel incorrect");

            assertEquals("Mot de passe actuel incorrect", exception.getMessage(),
                    "Le message d'erreur doit indiquer que le mot de passe est incorrect");

            verify(userRepository, never()).save(any());
        }
    }

    // =========================================================================
    // Tests pour updateUsername
    // =========================================================================
    @Nested
    @DisplayName("Tests pour updateUsername")
    class UpdateUsernameTests {

        @Test
        @DisplayName("Mise a jour du nom d'utilisateur reussie")
        void updateUsername_Success() {
            // Arrange
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(Users.class))).thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Users result = userService.updateUsername("test@example.com", "newUsername");

            // Assert
            assertNotNull(result, "L'utilisateur mis a jour ne doit pas etre null");
            // Note: Users.getUsername() returns email due to UserDetails override
            // The display name is accessed via getDisplayName() but the field "username" is set to "newUsername"
            verify(userRepository).save(any(Users.class));

            ArgumentCaptor<Users> userCaptor = ArgumentCaptor.forClass(Users.class);
            verify(userRepository).save(userCaptor.capture());
            assertEquals("newUsername", userCaptor.getValue().getDisplayName(),
                    "Le nom d'utilisateur doit etre mis a jour");
        }

        @Test
        @DisplayName("Mise a jour du nom d'utilisateur echoue si l'utilisateur n'existe pas")
        void updateUsername_UserNotFound_ThrowsException() {
            // Arrange
            when(userRepository.findByEmail("unknown@example.com")).thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.updateUsername("unknown@example.com", "newUsername"),
                    "Une exception doit etre levee si l'utilisateur n'est pas trouve");

            assertTrue(exception.getMessage().contains("non trouv\u00e9"),
                    "Le message d'erreur doit indiquer que l'utilisateur n'a pas ete trouve");
        }
    }

    // =========================================================================
    // Tests pour deleteUserAccount
    // =========================================================================
    @Nested
    @DisplayName("Tests pour deleteUserAccount")
    class DeleteUserAccountTests {

        @Test
        @DisplayName("Suppression de compte reussie - reservations annulees, codes supprimes, utilisateur supprime")
        void deleteUserAccount_Success() {
            // Arrange
            Reservation activeReservation1 = new Reservation();
            activeReservation1.setId(1L);
            activeReservation1.setUser(testUser);
            activeReservation1.setStatus(Reservation.Status.PENDING);

            Reservation activeReservation2 = new Reservation();
            activeReservation2.setId(2L);
            activeReservation2.setUser(testUser);
            activeReservation2.setStatus(Reservation.Status.CONFIRMED);

            List<Reservation> activeReservations = Arrays.asList(activeReservation1, activeReservation2);
            List<Reservation> allReservations = Arrays.asList(activeReservation1, activeReservation2);

            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
            when(reservationRepository.findByUserAndStatusIn(eq(testUser), anyList()))
                    .thenReturn(activeReservations);
            when(reservationRepository.findByUser(testUser)).thenReturn(allReservations);
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            assertDoesNotThrow(() ->
                    userService.deleteUserAccount("test@example.com", "password123"));

            // Assert - Verify reservations were cancelled
            verify(reservationRepository, times(2)).save(argThat(reservation ->
                    reservation.getStatus() == Reservation.Status.CANCELED));

            // Assert - Verify verification codes were deleted
            verify(verificationCodeRepository).deleteByUser(testUser);

            // Assert - Verify all reservations were deleted
            verify(reservationRepository).deleteAll(allReservations);

            // Assert - Verify entity manager flush was called
            verify(entityManager).flush();

            // Assert - Verify user was deleted
            verify(userRepository).deleteById(1L);
        }

        @Test
        @DisplayName("Suppression de compte echoue avec un mot de passe incorrect")
        void deleteUserAccount_WrongPassword_ThrowsException() {
            // Arrange
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> userService.deleteUserAccount("test@example.com", "wrongPassword"),
                    "Une exception doit etre levee pour un mot de passe incorrect");

            assertEquals("Mot de passe incorrect", exception.getMessage(),
                    "Le message d'erreur doit indiquer que le mot de passe est incorrect");

            verify(reservationRepository, never()).findByUserAndStatusIn(any(), anyList());
            verify(userRepository, never()).deleteById(anyLong());
        }

        @Test
        @DisplayName("Suppression de compte avec aucune reservation active")
        void deleteUserAccount_NoActiveReservations_Success() {
            // Arrange
            when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
            when(passwordEncoder.matches("password123", "encodedPassword")).thenReturn(true);
            when(reservationRepository.findByUserAndStatusIn(eq(testUser), anyList()))
                    .thenReturn(Collections.emptyList());
            when(reservationRepository.findByUser(testUser)).thenReturn(Collections.emptyList());

            // Act
            assertDoesNotThrow(() ->
                    userService.deleteUserAccount("test@example.com", "password123"));

            // Assert
            verify(reservationRepository, never()).save(any(Reservation.class));
            verify(verificationCodeRepository).deleteByUser(testUser);
            verify(userRepository).deleteById(1L);
        }
    }
}
