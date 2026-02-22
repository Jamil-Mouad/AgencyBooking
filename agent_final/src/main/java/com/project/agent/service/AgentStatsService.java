package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.project.agent.dto.AgentInfoDTO;
import com.project.agent.dto.AgentStatsDTO;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.Users;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

@Service
public class AgentStatsService {

    @Autowired
    private AgentRepository agentRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    /**
     * Récupère les informations de l'agent actuellement connecté
     */
    public AgentInfoDTO getCurrentAgentInfo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        Agent agent = agentRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        AgentInfoDTO agentInfo = new AgentInfoDTO();
        agentInfo.setId(agent.getId());
        agentInfo.setUsername(agent.getUsername());
        agentInfo.setEmail(agent.getEmail());
        agentInfo.setAvailable(agent.isAvailable());
        
        if (agent.getAgency() != null) {
            agentInfo.setAgencyId(agent.getAgency().getId());
            agentInfo.setAgencyName(agent.getAgency().getName());
        }
        
        return agentInfo;
    }
    
    /**
     * Calcule les statistiques pour l'agent actuel
     */
    public AgentStatsDTO getAgentStats() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        Agent agent = agentRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        // Calculer les statistiques des dernières 24 heures
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        
        // Obtenir toutes les réservations gérées par cet agent
        List<Reservation> allReservations = reservationRepository.findByHandledByAgent(agent);
        
        int recent = 0;
        int confirmed = 0;
        int completed = 0;
        int canceled = 0;
        
        for (Reservation reservation : allReservations) {
            // Vérifier si la mise à jour a été faite dans les dernières 24 heures
            if (reservation.getUpdatedAt() != null && 
                reservation.getUpdatedAt().isAfter(last24Hours)) {
                recent++;
            }
            
            // Compter par statut
            switch (reservation.getStatus()) {
                case CONFIRMED:
                    confirmed++;
                    break;
                case COMPLETED:
                    completed++;
                    break;
                case CANCELED:
                    canceled++;
                    break;
                default:
                    // Ne rien faire pour PENDING
                    break;
            }
        }
        
        return new AgentStatsDTO(recent, confirmed, completed, canceled);
    }
}