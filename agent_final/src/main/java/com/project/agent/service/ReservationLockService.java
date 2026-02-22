package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.project.agent.dto.LockStatusDTO;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.ReservationLock;
import com.project.agent.model.Users;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.ReservationLockRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

@Service
public class ReservationLockService {
    
    private static final Logger logger = LoggerFactory.getLogger(ReservationLockService.class);
    
    // Durée d'expiration des verrous en minutes
    private static final int LOCK_EXPIRATION_MINUTES = 5;
    
    // Cache for active locks to reduce database queries
    private final Map<Long, Long> activeLockCache = new ConcurrentHashMap<>();
    
    @Autowired
    private ReservationLockRepository lockRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AgentRepository agentRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Vérifie si une réservation est actuellement verrouillée
     */
    public boolean isReservationLocked(Reservation reservation) {
        // First check the cache to avoid database query
        if (activeLockCache.containsKey(reservation.getId())) {
            Long agentId = activeLockCache.get(reservation.getId());
            
            // Check if the lock belongs to the current agent
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            try {
                Agent currentAgent = agentRepository.findByUser_Email(email)
                        .orElseThrow(() -> new RuntimeException("Agent not found"));
                
                // If current agent holds the lock, it's not locked for them
                if (currentAgent.getId().equals(agentId)) {
                    return false;
                }
                
                // It's locked by someone else
                return true;
            } catch (Exception e) {
                logger.error("Error checking agent for lock: {}", e.getMessage());
                return true; // Safer to assume it's locked if we can't determine
            }
        }
        
        // Cache miss, check the database
        Optional<ReservationLock> existingLock = lockRepository.findFirstByReservationAndActiveOrderByIdDesc(reservation, true);
        
        if (existingLock.isPresent()) {
            ReservationLock lock = existingLock.get();
            
            // Vérifier si le verrou est expiré
            if (lock.isExpired()) {
                // Libérer le verrou expiré
                releaseLock(lock);
                return false;
            }
            
            // Add to cache
            if (lock.getLockedBy() != null) {
                activeLockCache.put(reservation.getId(), lock.getLockedBy().getId());
            }
            
            // Vérifier si le verrou appartient à l'agent actuel
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            if (lock.getLockedBy() != null && 
                lock.getLockedBy().getUser() != null && 
                lock.getLockedBy().getUser().getEmail().equals(email)) {
                // Le verrou appartient à l'agent actuel
                return false;
            }
            
            // La réservation est verrouillée par un autre agent
            return true;
        }
        
        // Aucun verrou actif
        return false;
    }
    
    /**
     * Obtient l'agent qui a verrouillé une réservation
     */
    public Agent getLockingAgent(Reservation reservation) {
        // Check cache first
        if (activeLockCache.containsKey(reservation.getId())) {
            Long agentId = activeLockCache.get(reservation.getId());
            try {
                return agentRepository.findById(agentId).orElse(null);
            } catch (Exception e) {
                logger.error("Error retrieving agent from cache: {}", e.getMessage());
                // Fall through to database check
            }
        }
        
        Optional<ReservationLock> existingLock = lockRepository.findFirstByReservationAndActiveOrderByIdDesc(reservation, true);
        
        if (existingLock.isPresent() && !existingLock.get().isExpired()) {
            Agent agent = existingLock.get().getLockedBy();
            // Update cache
            if (agent != null) {
                activeLockCache.put(reservation.getId(), agent.getId());
            }
            return agent;
        }
        
        return null;
    }
    
    /**
     * Tente de verrouiller une réservation pour l'agent actuel
     * @return true si le verrouillage a réussi, false sinon
     */
    @Transactional
    public boolean lockReservation(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        // Vérifier si la réservation est déjà verrouillée
        if (isReservationLocked(reservation)) {
            return false;
        }
        
        // Obtenir l'agent actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        Agent agent = agentRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        // Créer un nouveau verrou
        ReservationLock lock = new ReservationLock();
        lock.setReservation(reservation);
        lock.setLockedBy(agent);
        lock.setLockedAt(LocalDateTime.now());
        lock.setExpiresAt(LocalDateTime.now().plusMinutes(LOCK_EXPIRATION_MINUTES));
        lock.setActive(true);
        
        // Sauvegarder le verrou
        lock = lockRepository.save(lock);
        
        // Update cache
        activeLockCache.put(reservationId, agent.getId());
        
        // Notifier les autres agents
        notifyLockStatus(reservation, agent, true);
        
        logger.info("Réservation {} verrouillée par l'agent {}", reservationId, agent.getId());
        return true;
    }
    
    /**
     * Libère le verrou sur une réservation
     */
    @Transactional
    public void releaseReservationLock(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        Optional<ReservationLock> existingLock = lockRepository.findFirstByReservationAndActiveOrderByIdDesc(reservation, true);
        
        if (existingLock.isPresent()) {
            ReservationLock lock = existingLock.get();
            
            // Vérifier si le verrou appartient à l'agent actuel
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String email = authentication.getName();
            
            if (lock.getLockedBy() != null && 
                lock.getLockedBy().getUser() != null && 
                lock.getLockedBy().getUser().getEmail().equals(email)) {
                
                // Libérer le verrou
                releaseLock(lock);
                
                // Remove from cache
                activeLockCache.remove(reservationId);
                
                // Notifier les autres agents
                notifyLockStatus(reservation, lock.getLockedBy(), false);
                
                logger.info("Verrou sur la réservation {} libéré par l'agent {}", 
                        reservationId, lock.getLockedBy().getId());
            } else {
                logger.warn("Tentative de libération d'un verrou par un agent non autorisé");
                throw new RuntimeException("Vous n'êtes pas autorisé à libérer ce verrou");
            }
        }
    }
    
    /**
     * Prolonger un verrou existant
     */
    @Transactional
    public boolean extendLock(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
                
        Optional<ReservationLock> existingLock = lockRepository.findFirstByReservationAndActiveOrderByIdDesc(reservation, true);
        
        if (!existingLock.isPresent()) {
            return false;
        }
        
        ReservationLock lock = existingLock.get();
        
        // Vérifier si le verrou appartient à l'agent actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        if (lock.getLockedBy() != null && 
            lock.getLockedBy().getUser() != null && 
            lock.getLockedBy().getUser().getEmail().equals(email)) {
            
            // Prolonger le verrou
            lock.setExpiresAt(LocalDateTime.now().plusMinutes(LOCK_EXPIRATION_MINUTES));
            lockRepository.save(lock);
            
            logger.info("Verrou sur la réservation {} prolongé par l'agent {}", 
                    reservationId, lock.getLockedBy().getId());
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Libère le verrou sur une réservation par force (pour admins)
     */
    @Transactional
    public void forceReleaseReservationLock(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        Optional<ReservationLock> existingLock = lockRepository.findFirstByReservationAndActiveOrderByIdDesc(reservation, true);
        
        if (existingLock.isPresent()) {
            ReservationLock lock = existingLock.get();
            
            // Obtenir l'agent actuel pour les logs
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String adminEmail = authentication.getName();
            
            // Libérer le verrou
            releaseLock(lock);
            
            // Remove from cache
            activeLockCache.remove(reservationId);
            
            // Notifier les autres agents
            Agent lockingAgent = lock.getLockedBy();
            notifyLockStatus(reservation, lockingAgent, false);
            
            logger.info("Verrou sur la réservation {} FORCÉ par l'admin {}", 
                    reservationId, adminEmail);
        }
    }
    
    /**
     * Libère un verrou spécifique
     */
    @Transactional
    private void releaseLock(ReservationLock lock) {
        lock.setActive(false);
        lockRepository.save(lock);
        
        // Remove from cache if present
        if (lock.getReservation() != null) {
            activeLockCache.remove(lock.getReservation().getId());
        }
    }
    
    /**
     * Vérifie et libère les verrous expirés toutes les minutes
     */
    @Scheduled(fixedRate = 60000) // Exécuté toutes les minutes
    @Transactional
    public void cleanupExpiredLocks() {
        LocalDateTime now = LocalDateTime.now();
        List<ReservationLock> expiredLocks = lockRepository.findByActiveAndExpiresAtBefore(true, now);
        
        for (ReservationLock lock : expiredLocks) {
            logger.info("Libération automatique du verrou expiré sur la réservation {}", 
                    lock.getReservation().getId());
            
            // Désactiver le verrou
            lock.setActive(false);
            lockRepository.save(lock);
            
            // Remove from cache
            if (lock.getReservation() != null) {
                activeLockCache.remove(lock.getReservation().getId());
            }
            
            // Notifier les autres agents
            notifyLockStatus(lock.getReservation(), lock.getLockedBy(), false);
        }
        
        if (!expiredLocks.isEmpty()) {
            logger.info("{} verrous expirés ont été libérés", expiredLocks.size());
        }
    }
    
    /**
     * Nettoie périodiquement le cache des verrous
     */
    @Scheduled(fixedRate = 300000) // Toutes les 5 minutes
    public void cleanupLockCache() {
        logger.debug("Nettoyage du cache de verrous: {} entrées avant nettoyage", activeLockCache.size());
        
        // Loop through cache and verify against database
        activeLockCache.entrySet().removeIf(entry -> {
            Long reservationId = entry.getKey();
            try {
                Reservation reservation = reservationRepository.findById(reservationId).orElse(null);
                if (reservation == null) {
                    return true; // Remove if reservation doesn't exist
                }
                
                boolean hasActiveLock = lockRepository.findFirstByReservationAndActiveOrderByIdDesc(reservation, true).isPresent();
                return !hasActiveLock; // Remove if no active lock exists
            } catch (Exception e) {
                logger.error("Error during lock cache cleanup for reservation {}: {}", reservationId, e.getMessage());
                return false; // Keep in cache on error to be safe
            }
        });
        
        logger.debug("Cache de verrous nettoyé: {} entrées après nettoyage", activeLockCache.size());
    }
    
    /**
     * Envoie une notification WebSocket sur le statut de verrouillage d'une réservation
     */
    private void notifyLockStatus(Reservation reservation, Agent agent, boolean locked) {
        if (reservation == null) return;
        
        LockStatusDTO lockStatus = new LockStatusDTO();
        lockStatus.setReservationId(reservation.getId());
        lockStatus.setLocked(locked);
        
        if (agent != null) {
            lockStatus.setAgentId(agent.getId());
            lockStatus.setAgentName(agent.getUsername());
            if (agent.getUser() != null) {
                lockStatus.setAgentEmail(agent.getUser().getEmail());
            }
        }

        // Si le verrou est libéré, ajouter un message explicatif
        if (!locked) {
            lockStatus.setLockMessage("Réservation disponible pour traitement");
        } else {
            String agentInfo = agent != null ? agent.getUsername() : "un agent";
            if (agent != null && agent.getUser() != null) {
                agentInfo += " (" + agent.getUser().getEmail() + ")";
            }
            lockStatus.setLockMessage("En cours de traitement par " + agentInfo);
        }
        
        // Envoyer aux abonnés du topic général
        messagingTemplate.convertAndSend("/topic/reservation-lock-status", lockStatus);
        
        // Envoyer aussi au topic spécifique de cette réservation
        messagingTemplate.convertAndSend("/topic/lock-status/" + reservation.getId(), lockStatus);
    }
}