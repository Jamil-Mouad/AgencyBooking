package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.project.agent.controller.UserController;
import com.project.agent.dto.RegisterRequest;
import com.project.agent.dto.VerifyCodeRequest;
import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.model.PendingUser;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.model.Users.Role;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.PendingUserRepository;
import com.project.agent.repository.ContactMessageRepository;
import com.project.agent.repository.ReservationLockRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.BlockedTimeSlotRepository;
import com.project.agent.repository.UserRepository;
import com.project.agent.repository.VerificationCodeRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService implements UserDetailsService {

	 private static final Logger logger = LoggerFactory.getLogger(UserController.class);
	
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    

	@Autowired
	private PendingUserRepository pendingUserRepository;
	
	@Autowired
	private EmailService emailService;
	
	@Autowired
	private AgentRepository agentRepository;

	@Autowired
	private AgencyRepository agencyRepository;
	
    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
	private ReservationRepository reservationRepository;
    
    @Autowired
	private VerificationCodeRepository verificationCodeRepository;

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @Autowired
    private ReservationLockRepository reservationLockRepository;

    @Autowired
    private BlockedTimeSlotRepository blockedTimeSlotRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec l'email: " + email));
    }   
    public void initiateRegistration(RegisterRequest registerRequest) {
    	// Vérifier si l'email est déjà utilisé par un utilisateur enregistré
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }
        
        // Vérifier si les mots de passe correspondent
        if (!registerRequest.getPassword().equals(registerRequest.getPasswordConfirm())) {
            throw new RuntimeException("Les mots de passe ne correspondent pas");
        }
        
        // Supprimer toute inscription en attente précédente avec cet email
        pendingUserRepository.findByEmail(registerRequest.getEmail())
                .ifPresent(user -> pendingUserRepository.delete(user));
        
        // Générer un code de vérification
        String code = generateVerificationCode();
        
        // Créer un utilisateur en attente
        PendingUser pendingUser = new PendingUser();
        pendingUser.setUsername(registerRequest.getUsername());
        pendingUser.setEmail(registerRequest.getEmail());
        pendingUser.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        pendingUser.setVerificationCode(code);
        pendingUser.setCreatedAt(LocalDateTime.now());
        pendingUser.setExpiresAt(LocalDateTime.now().plusMinutes(15)); // Expiration après 15 minutes
        
        pendingUserRepository.save(pendingUser);
        
        // Envoyer le code de vérification par email
        emailService.sendRegistrationVerificationCode(pendingUser.getEmail(), pendingUser.getUsername(), code);}

		/**
		 * Complète l'inscription après vérification de l'email
		 */
		public Users completeRegistration(VerifyCodeRequest verifyRequest) {
		    PendingUser pendingUser = pendingUserRepository.findByEmailAndVerificationCode(
		            verifyRequest.getEmail(), verifyRequest.getCode())
		            .orElseThrow(() -> new RuntimeException("Code de vérification invalide ou email non reconnu"));
		    
		    if (pendingUser.isExpired()) {
		        pendingUserRepository.delete(pendingUser);
		        throw new RuntimeException("Le code de vérification a expiré. Veuillez vous réinscrire.");
		    }
		    
		    // Créer l'utilisateur validé
		    Users user = new Users();
		    user.setUsername(pendingUser.getUsername());
		    user.setEmail(pendingUser.getEmail());
		    user.setPassword(pendingUser.getPassword()); // Déjà encodé
		    user.setRole(Role.USER);
		    
		    // Enregistrer l'utilisateur
		    Users savedUser = userRepository.save(user);
		    
		    // Supprimer l'utilisateur en attente
		    pendingUserRepository.delete(pendingUser);
		    
		    return savedUser;
		}
		
		/**
		 * Génère un code de vérification à 6 chiffres
		 */
		private String generateVerificationCode() {
		    Random random = new Random();
		    int code = 100000 + random.nextInt(900000);
		    return String.valueOf(code);
		}
		public Users registerUser(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }
        
        if (!registerRequest.getPassword().equals(registerRequest.getPasswordConfirm())) {
            throw new RuntimeException("Les mots de passe ne correspondent pas");
        }
        
        Users user = new Users();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setRole(Role.USER); // Par défaut, tous les nouveaux utilisateurs ont le rôle USER
        
        return userRepository.save(user);
    }
    
    
		@Transactional
		public Users changeUserRole(Long userId, Role newRole) {
		    Users user = userRepository.findById(userId)
		            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
		    
		    // Vérifier que le changement est autorisé (seulement USER → ADMIN ou ADMIN → USER)
		    if (user.getRole() == Role.AGENT || newRole == Role.AGENT) {
		        throw new RuntimeException("Impossible de modifier le rôle pour/depuis AGENT. Utilisez la section dédiée.");
		    }
		    
		    user.setRole(newRole);
		    return userRepository.save(user);
		}
	    public Optional<Users> findByEmail(String email) {
	        return userRepository.findByEmail(email);
	    }
    
    /**
     * Register a new agent
     */
    @Transactional
    public Agent registerAgent(RegisterRequest registerRequest, Long agencyId) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé");
        }
        
        if (!registerRequest.getPassword().equals(registerRequest.getPasswordConfirm())) {
            throw new RuntimeException("Les mots de passe ne correspondent pas");
        }
        
        // First, create and save the user
        Users user = new Users();
        user.setUsername(registerRequest.getUsername());
        user.setEmail(registerRequest.getEmail());
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setRole(Role.AGENT);
        user = userRepository.save(user);
        
        // Then create the agent linked to this user
        Agent agent = new Agent();
        agent.setUser(user);
        agent.setAvailable(true);
        
        // Assign to agency if specified
        if (agencyId != null) {
            Agency agency = agencyRepository.findById(agencyId)
                    .orElseThrow(() -> new RuntimeException("Agency not found"));
            agent.setAgency(agency);
        }
        
        // Save and return the agent
        return agentRepository.save(agent);
    }

    /**
     * Convert an existing user to an agent
     */
    @Deprecated
    @Transactional
    public Agent convertUserToAgent(Long userId, Long agencyId) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Check if already an agent
        if (user.getRole() == Role.AGENT) {
            // Check if agent record already exists
            Optional<Agent> existingAgent = agentRepository.findByUser(user);
            if (existingAgent.isPresent()) {
                throw new RuntimeException("User is already an agent");
            }
        }
        
        // Update user role
        user.setRole(Role.AGENT);
        userRepository.save(user);
        
        // Create a new agent record
        Agent agent = new Agent();
        agent.setUser(user);
        agent.setAvailable(true);
        
        // Assign to agency if specified
        if (agencyId != null) {
            Agency agency = agencyRepository.findById(agencyId)
                    .orElseThrow(() -> new RuntimeException("Agency not found"));
            agent.setAgency(agency);
        }
        
        // Save and return the agent
        return agentRepository.save(agent);
    }
    
 // Ajouter ces méthodes à votre classe UserService existante

    /**
     * Met à jour le nom d'utilisateur
     */
    @Transactional
    public Users updateUsername(String email, String newUsername) {
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        user.setUsername(newUsername);
        return userRepository.save(user);
    }

    /**
     * Change le mot de passe d'un utilisateur
     */
    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Vérifier que l'ancien mot de passe est correct
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Mot de passe actuel incorrect");
        }
        
        // Mettre à jour le mot de passe
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
    
    /**
     * Supprime le compte d'un utilisateur
     */
    @Transactional
    public void deleteUserAccount(String email, String password) {
        logger.info("Tentative de suppression de compte pour {}", email);
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.error("Utilisateur non trouvé: {}", email);
                    return new RuntimeException("Utilisateur non trouvé");
                });
        
        // Vérifier que le mot de passe est correct
        if (!passwordEncoder.matches(password, user.getPassword())) {
            logger.error("Échec de suppression de compte pour {}: mot de passe incorrect", email);
            throw new RuntimeException("Mot de passe incorrect");
        }
        
        try {
            Long userId = user.getId();
            
            // 1. Trouver et annuler les réservations actives
            List<Reservation> activeReservations = reservationRepository.findByUserAndStatusIn(
                    user, 
                    Arrays.asList(Reservation.Status.PENDING, Reservation.Status.CONFIRMED)
            );
            
            logger.info("Nombre de réservations actives à annuler: {}", activeReservations.size());
            
            for (Reservation reservation : activeReservations) {
                reservation.setStatus(Reservation.Status.CANCELED);
                reservation.setUpdatedAt(LocalDateTime.now());
                reservationRepository.save(reservation);
                logger.info("Réservation {} annulée", reservation.getId());
            }
            
            // 2. Supprimer explicitement d'abord les entités dépendantes (en commençant par les codes de vérification)
            verificationCodeRepository.deleteByUser(user);
            logger.info("Codes de vérification supprimés pour {}", email);
            
            // 3. Supprimer explicitement les réservations associées à cet utilisateur
            // Cette étape pourrait être nécessaire si vous n'avez pas de cascade DELETE sur les réservations
            List<Reservation> allUserReservations = reservationRepository.findByUser(user);
            if (!allUserReservations.isEmpty()) {
                logger.info("Suppression de {} réservations associées à l'utilisateur", allUserReservations.size());
                
                // Option 1: Utiliser deleteAll (peut être plus rapide pour plusieurs enregistrements)
                reservationRepository.deleteAll(allUserReservations);
            }
            
            // 4. Forcer le flush pour s'assurer que toutes les opérations ci-dessus sont effectuées
            entityManager.flush();
            
            // 5. Maintenant, supprimer l'utilisateur
            userRepository.deleteById(userId);
            logger.info("Compte utilisateur supprimé avec succès: {}", email);
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression du compte {}: {}", email, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la suppression du compte: " + e.getMessage());
        }
    }
 // src/main/java/com/project/agent/service/UserService.java

    /**
     * Supprime un compte utilisateur par son ID (pour l'administrateur)
     */
    @Transactional
    public void deleteUserAccountById(Long userId) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        String email = user.getEmail();
        logger.info("Demande de suppression administrative pour le compte {}", email);
        
        // Vérifier si l'utilisateur est un agent
        Optional<Agent> agentOpt = agentRepository.findByUser(user);
        if (agentOpt.isPresent()) {
            // Supprimer d'abord l'entité Agent
            Agent agent = agentOpt.get();

            // Nullifier handledByAgent sur les réservations
            List<Reservation> handledReservations = reservationRepository.findByHandledByAgent(agent);
            for (Reservation r : handledReservations) {
                r.setHandledByAgent(null);
                reservationRepository.save(r);
            }

            // Supprimer les blocked time slots
            blockedTimeSlotRepository.deleteAll(blockedTimeSlotRepository.findByBlockedBy(agent));

            // Supprimer les ReservationLocks associés à cet agent
            reservationLockRepository.deleteByLockedBy(agent);

            // Désassocier l'agent de toute agence
            if (agent.getAgency() != null) {
                agent.setAgency(null);
                agentRepository.save(agent);
            }

            // Supprimer l'agent
            agentRepository.delete(agent);
            logger.info("Entité Agent associée supprimée pour {}", email);
        }
        
        try {
            Long userIdToDelete = user.getId();
            
            // 1. Annuler les réservations actives
            List<Reservation> activeReservations = reservationRepository.findByUserAndStatusIn(
                    user, 
                    Arrays.asList(Reservation.Status.PENDING, Reservation.Status.CONFIRMED)
            );
            
            logger.info("Nombre de réservations actives à annuler: {}", activeReservations.size());
            
            for (Reservation reservation : activeReservations) {
                reservation.setStatus(Reservation.Status.CANCELED);
                reservation.setUpdatedAt(LocalDateTime.now());
                reservationRepository.save(reservation);
            }
            
            // 2. Supprimer les codes de vérification
            verificationCodeRepository.deleteByUser(user);

            // 3. Supprimer les ReservationLocks pour les réservations de l'utilisateur
            List<Reservation> allUserReservations = reservationRepository.findByUser(user);
            if (!allUserReservations.isEmpty()) {
                reservationLockRepository.deleteByReservationIn(allUserReservations);
            }

            // 4. Supprimer les ContactMessages
            contactMessageRepository.deleteByUser(user);

            // 5. Supprimer les réservations
            reservationRepository.deleteAll(allUserReservations);
            
            // 5. Forcer le flush
            entityManager.flush();
            
            // 6. Supprimer l'utilisateur
            userRepository.deleteById(userIdToDelete);
            logger.info("Compte utilisateur supprimé avec succès par un administrateur: {}", email);
            
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression administrative du compte {}: {}", email, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la suppression du compte: " + e.getMessage());
        }
    }

    /**
     * Supprime un agent et son compte utilisateur associé
     */
    @Transactional
    public void deleteAgentAccount(Long agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));

        Users user = agent.getUser();
        if (user == null) {
            throw new RuntimeException("Compte utilisateur associé non trouvé");
        }

        // 1. Nullify handledByAgent on all reservations handled by this agent
        List<Reservation> handledReservations = reservationRepository.findByHandledByAgent(agent);
        for (Reservation reservation : handledReservations) {
            reservation.setHandledByAgent(null);
            reservationRepository.save(reservation);
        }

        // 2. Delete blocked time slots created by this agent
        blockedTimeSlotRepository.deleteAll(blockedTimeSlotRepository.findByBlockedBy(agent));

        // 3. Delete reservation locks by this agent
        reservationLockRepository.deleteByLockedBy(agent);

        // 4. Désassocier l'agent de l'agence
        if (agent.getAgency() != null) {
            agent.setAgency(null);
            agentRepository.save(agent);
        }

        // 5. Supprimer l'agent
        agentRepository.delete(agent);

        // 6. Supprimer le compte utilisateur
        deleteUserAccountById(user.getId());
    }
}