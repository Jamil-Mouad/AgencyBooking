package com.project.agent.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.project.agent.dto.ReservationRequest;
import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.Reservation.Status;
import com.project.agent.model.Users;
import com.project.agent.model.Users.Role;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AgencyRepository agencyRepository;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private AvailabilityService availabilityService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private ReservationService reservationService;

    private Users testUser;
    private Users agentUser;
    private Agent testAgent;
    private Agency testAgency;
    private Reservation testReservation;

    @BeforeEach
    void setUp() {
        testUser = new Users();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("user@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setRole(Role.USER);

        agentUser = new Users();
        agentUser.setId(2L);
        agentUser.setUsername("agentuser");
        agentUser.setEmail("agent@example.com");
        agentUser.setPassword("encodedPassword");
        agentUser.setRole(Role.AGENT);

        testAgency = new Agency();
        testAgency.setId(1L);
        testAgency.setName("Test Agency");
        testAgency.setAddress("123 Test St");
        testAgency.setCity("Test City");
        testAgency.setPhoneNumber("0123456789");

        testAgent = new Agent();
        testAgent.setId(1L);
        testAgent.setUser(agentUser);
        testAgent.setAgency(testAgency);
        testAgent.setAvailable(true);

        testReservation = new Reservation();
        testReservation.setId(1L);
        testReservation.setUser(testUser);
        testReservation.setAgency(testAgency);
        testReservation.setService("Voyage");
        testReservation.setDescription("Voyage a Paris");
        testReservation.setStatus(Status.PENDING);
        testReservation.setCreatedAt(LocalDateTime.now());
    }

    /**
     * Configure le SecurityContext pour simuler un utilisateur authentifie.
     */
    private void setupSecurityContext(String email) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn(email);
    }

    // =========================================================================
    // Tests pour createReservation
    // =========================================================================
    @Nested
    @DisplayName("Tests pour createReservation")
    class CreateReservationTests {

        @Test
        @DisplayName("Creation de reservation reussie")
        void createReservation_Success() {
            // Arrange
            setupSecurityContext("user@example.com");

            ReservationRequest request = new ReservationRequest();
            request.setService("Voyage");
            request.setDescription("Voyage a Paris");
            request.setAgencyId(1L);

            when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
            when(reservationRepository.findByUserAndStatusIn(eq(testUser), anyList()))
                    .thenReturn(Collections.emptyList());
            when(agencyRepository.findById(1L)).thenReturn(Optional.of(testAgency));
            when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> {
                Reservation reservation = invocation.getArgument(0);
                reservation.setId(1L);
                return reservation;
            });

            // Act
            Reservation result = reservationService.createReservation(request);

            // Assert
            assertNotNull(result, "La reservation creee ne doit pas etre null");
            assertEquals(Status.PENDING, result.getStatus(),
                    "Le statut initial doit etre PENDING");
            assertEquals(testUser, result.getUser(),
                    "L'utilisateur doit etre correctement assigne");
            assertEquals(testAgency, result.getAgency(),
                    "L'agence doit etre correctement assignee");
            assertEquals("Voyage", result.getService(),
                    "Le service doit correspondre");
            assertEquals("Voyage a Paris", result.getDescription(),
                    "La description doit correspondre");
            assertNull(result.getHandledByAgent(),
                    "Aucun agent ne doit etre assigne initialement");
            assertNotNull(result.getCreatedAt(),
                    "La date de creation doit etre definie");

            verify(reservationRepository).save(any(Reservation.class));
            verify(messagingTemplate).convertAndSend(eq("/topic/reservations"), any(Reservation.class));
        }

        @Test
        @DisplayName("Creation de reservation echoue si l'utilisateur a deja une reservation active")
        void createReservation_UserHasActiveReservation_ThrowsException() {
            // Arrange
            setupSecurityContext("user@example.com");

            ReservationRequest request = new ReservationRequest();
            request.setService("Voyage");
            request.setDescription("Autre voyage");
            request.setAgencyId(1L);

            Reservation existingReservation = new Reservation();
            existingReservation.setId(99L);
            existingReservation.setStatus(Status.PENDING);

            when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
            when(reservationRepository.findByUserAndStatusIn(eq(testUser), anyList()))
                    .thenReturn(Arrays.asList(existingReservation));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.createReservation(request),
                    "Une exception doit etre levee si l'utilisateur a deja une reservation active");

            assertTrue(exception.getMessage().contains("r\u00e9servation active"),
                    "Le message doit mentionner la reservation active existante");

            verify(reservationRepository, never()).save(any(Reservation.class));
            verify(messagingTemplate, never()).convertAndSend(anyString(), any(Reservation.class));
        }

        @Test
        @DisplayName("Creation de reservation avec date preferee marque le creneau temporairement")
        void createReservation_WithPreferredDate_MarksTimeSlot() {
            // Arrange
            setupSecurityContext("user@example.com");

            ReservationRequest request = new ReservationRequest();
            request.setService("Voyage");
            request.setDescription("Voyage avec date");
            request.setAgencyId(1L);
            request.setPreferredDate("2025-06-15T10:00:00");

            when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
            when(reservationRepository.findByUserAndStatusIn(eq(testUser), anyList()))
                    .thenReturn(Collections.emptyList());
            when(agencyRepository.findById(1L)).thenReturn(Optional.of(testAgency));
            when(reservationRepository.save(any(Reservation.class))).thenAnswer(invocation -> {
                Reservation reservation = invocation.getArgument(0);
                reservation.setId(1L);
                return reservation;
            });

            // Act
            Reservation result = reservationService.createReservation(request);

            // Assert
            assertNotNull(result, "La reservation doit etre creee");
            verify(availabilityService).markTimeSlotAsTemporarilyBooked(
                    eq(testAgency), eq(LocalDateTime.of(2025, 6, 15, 10, 0, 0)));
        }
    }

    // =========================================================================
    // Tests pour confirmReservation
    // =========================================================================
    @Nested
    @DisplayName("Tests pour confirmReservation")
    class ConfirmReservationTests {

        @Test
        @DisplayName("Confirmation de reservation reussie")
        void confirmReservation_Success() {
            // Arrange
            setupSecurityContext("agent@example.com");

            LocalDateTime start = LocalDateTime.of(2025, 6, 15, 10, 0);
            LocalDateTime end = LocalDateTime.of(2025, 6, 15, 11, 0);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));
            when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agentUser));
            when(agentRepository.findByUser(agentUser)).thenReturn(Optional.of(testAgent));
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Reservation result = reservationService.confirmReservation(1L, start, end, "Rendez-vous confirme");

            // Assert
            assertNotNull(result, "La reservation confirmee ne doit pas etre null");
            assertEquals(Status.CONFIRMED, result.getStatus(),
                    "Le statut doit etre CONFIRMED");
            assertEquals(start, result.getStartDateTime(),
                    "La date de debut doit correspondre");
            assertEquals(end, result.getEndDateTime(),
                    "La date de fin doit correspondre");
            assertEquals(testAgent, result.getHandledByAgent(),
                    "L'agent doit etre assigne");
            assertNotNull(result.getUpdatedAt(),
                    "La date de mise a jour doit etre definie");
            assertTrue(result.getDescription().contains("Message de l'agent"),
                    "La description doit contenir le message de l'agent");

            verify(availabilityService).updateAvailabilityAfterReservation(any(Reservation.class));
            verify(messagingTemplate).convertAndSend(eq("/topic/reservation-updated"), any(Reservation.class));
        }

        @Test
        @DisplayName("Confirmation echoue si la reservation n'est pas trouvee")
        void confirmReservation_NotFound_ThrowsException() {
            // Arrange
            setupSecurityContext("agent@example.com");

            LocalDateTime start = LocalDateTime.of(2025, 6, 15, 10, 0);
            LocalDateTime end = LocalDateTime.of(2025, 6, 15, 11, 0);

            when(reservationRepository.findById(99L)).thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.confirmReservation(99L, start, end),
                    "Une exception doit etre levee si la reservation n'est pas trouvee");

            assertTrue(exception.getMessage().contains("non trouv\u00e9e"),
                    "Le message doit indiquer que la reservation n'a pas ete trouvee");
        }

        @Test
        @DisplayName("Confirmation echoue si la reservation est deja confirmee")
        void confirmReservation_AlreadyConfirmed_ThrowsException() {
            // Arrange
            setupSecurityContext("agent@example.com");

            testReservation.setStatus(Status.CONFIRMED);

            LocalDateTime start = LocalDateTime.of(2025, 6, 15, 10, 0);
            LocalDateTime end = LocalDateTime.of(2025, 6, 15, 11, 0);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.confirmReservation(1L, start, end),
                    "Une exception doit etre levee si la reservation n'est pas en attente");

            assertTrue(exception.getMessage().contains("pas en attente"),
                    "Le message doit indiquer que la reservation n'est pas en attente");

            verify(reservationRepository, never()).save(any(Reservation.class));
        }

        @Test
        @DisplayName("Confirmation echoue si la date de debut est apres la date de fin")
        void confirmReservation_StartAfterEnd_ThrowsException() {
            // Arrange
            setupSecurityContext("agent@example.com");

            LocalDateTime start = LocalDateTime.of(2025, 6, 15, 12, 0);
            LocalDateTime end = LocalDateTime.of(2025, 6, 15, 10, 0);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.confirmReservation(1L, start, end),
                    "Une exception doit etre levee si la date de debut est apres la fin");

            assertTrue(exception.getMessage().contains("date de d\u00e9but"),
                    "Le message doit mentionner la contrainte de dates");
        }
    }

    // =========================================================================
    // Tests pour cancelReservation
    // =========================================================================
    @Nested
    @DisplayName("Tests pour cancelReservation")
    class CancelReservationTests {

        @Test
        @DisplayName("Annulation de reservation reussie")
        void cancelReservation_Success() {
            // Arrange
            setupSecurityContext("agent@example.com");
            doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_AGENT")))
                    .when(authentication).getAuthorities();

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));
            when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agentUser));
            when(agentRepository.findByUser(agentUser)).thenReturn(Optional.of(testAgent));
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Reservation result = reservationService.cancelReservation(1L, "Annule par l'agent");

            // Assert
            assertNotNull(result, "La reservation annulee ne doit pas etre null");
            assertEquals(Status.CANCELED, result.getStatus(),
                    "Le statut doit etre CANCELED");
            assertNotNull(result.getUpdatedAt(),
                    "La date de mise a jour doit etre definie");
            assertEquals(testAgent, result.getHandledByAgent(),
                    "L'agent doit etre assigne");

            verify(reservationRepository).save(any(Reservation.class));
            verify(messagingTemplate).convertAndSend(eq("/topic/reservation-updated"), any(Reservation.class));
        }

        @Test
        @DisplayName("Annulation echoue si la reservation est deja terminee")
        void cancelReservation_AlreadyCompleted_ThrowsException() {
            // Arrange
            setupSecurityContext("agent@example.com");
            testReservation.setStatus(Status.COMPLETED);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.cancelReservation(1L, "Raison"),
                    "Une exception doit etre levee si la reservation ne peut pas etre annulee");

            assertTrue(exception.getMessage().contains("ne peut pas \u00eatre annul\u00e9e"),
                    "Le message doit indiquer que la reservation ne peut pas etre annulee");

            verify(reservationRepository, never()).save(any(Reservation.class));
        }

        @Test
        @DisplayName("Annulation d'une reservation confirmee reussie")
        void cancelReservation_ConfirmedReservation_Success() {
            // Arrange
            setupSecurityContext("agent@example.com");
            doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_AGENT")))
                    .when(authentication).getAuthorities();

            testReservation.setStatus(Status.CONFIRMED);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));
            when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agentUser));
            when(agentRepository.findByUser(agentUser)).thenReturn(Optional.of(testAgent));
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Reservation result = reservationService.cancelReservation(1L);

            // Assert
            assertEquals(Status.CANCELED, result.getStatus(),
                    "Le statut doit etre CANCELED");
        }

        @Test
        @DisplayName("Annulation libere le creneau si une date preferee existe")
        void cancelReservation_WithPreferredDate_ReleasesTimeSlot() {
            // Arrange
            setupSecurityContext("user@example.com");
            doReturn(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
                    .when(authentication).getAuthorities();

            testReservation.setPreferredDate("2025-06-15T10:00:00");

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Reservation result = reservationService.cancelReservation(1L, null);

            // Assert
            assertEquals(Status.CANCELED, result.getStatus(),
                    "Le statut doit etre CANCELED");
            verify(availabilityService).releaseTimeSlot(
                    eq(testAgency), eq(LocalDateTime.of(2025, 6, 15, 10, 0, 0)));
        }
    }

    // =========================================================================
    // Tests pour completeReservation
    // =========================================================================
    @Nested
    @DisplayName("Tests pour completeReservation")
    class CompleteReservationTests {

        @Test
        @DisplayName("Completion de reservation reussie")
        void completeReservation_Success() {
            // Arrange
            setupSecurityContext("agent@example.com");

            testReservation.setStatus(Status.CONFIRMED);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));
            when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agentUser));
            when(agentRepository.findByUser(agentUser)).thenReturn(Optional.of(testAgent));
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Reservation result = reservationService.completeReservation(1L, "Service termine avec succes");

            // Assert
            assertNotNull(result, "La reservation completee ne doit pas etre null");
            assertEquals(Status.COMPLETED, result.getStatus(),
                    "Le statut doit etre COMPLETED");
            assertEquals(testAgent, result.getHandledByAgent(),
                    "L'agent doit etre assigne");
            assertNotNull(result.getUpdatedAt(),
                    "La date de mise a jour doit etre definie");
            assertTrue(result.getDescription().contains("Notes de compl\u00e9tion"),
                    "La description doit contenir les notes de completion");

            verify(reservationRepository).save(any(Reservation.class));
            verify(messagingTemplate).convertAndSend(eq("/topic/reservation-updated"), any(Reservation.class));
        }

        @Test
        @DisplayName("Completion echoue si la reservation n'est pas confirmee")
        void completeReservation_NotConfirmed_ThrowsException() {
            // Arrange
            setupSecurityContext("agent@example.com");

            testReservation.setStatus(Status.PENDING);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.completeReservation(1L, "Notes"),
                    "Une exception doit etre levee si la reservation n'est pas confirmee");

            assertTrue(exception.getMessage().contains("confirm\u00e9es"),
                    "Le message doit indiquer que seules les reservations confirmees peuvent etre completees");

            verify(reservationRepository, never()).save(any(Reservation.class));
        }

        @Test
        @DisplayName("Completion reussie sans notes via surcharge")
        void completeReservation_WithoutNotes_Success() {
            // Arrange
            setupSecurityContext("agent@example.com");

            testReservation.setStatus(Status.CONFIRMED);

            when(reservationRepository.findById(1L)).thenReturn(Optional.of(testReservation));
            when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agentUser));
            when(agentRepository.findByUser(agentUser)).thenReturn(Optional.of(testAgent));
            when(reservationRepository.save(any(Reservation.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            Reservation result = reservationService.completeReservation(1L);

            // Assert
            assertEquals(Status.COMPLETED, result.getStatus(),
                    "Le statut doit etre COMPLETED");
            verify(reservationRepository).save(any(Reservation.class));
        }

        @Test
        @DisplayName("Completion echoue si la reservation n'est pas trouvee")
        void completeReservation_NotFound_ThrowsException() {
            // Arrange
            setupSecurityContext("agent@example.com");

            when(reservationRepository.findById(99L)).thenReturn(Optional.empty());

            // Act & Assert
            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> reservationService.completeReservation(99L),
                    "Une exception doit etre levee si la reservation n'existe pas");

            assertTrue(exception.getMessage().contains("non trouv\u00e9e"),
                    "Le message doit indiquer que la reservation n'a pas ete trouvee");
        }
    }
}
