package com.project.agent.controller;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.model.Reservation.Status;
import com.project.agent.model.Users.Role;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.ServiceOfferingRepository;
import com.project.agent.repository.UserRepository;

@RestController
@RequestMapping("/api/public/stats")
public class PublicStatsController {
    
    private static final Logger logger = LoggerFactory.getLogger(PublicStatsController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;
    
    /**
     * Récupère les statistiques générales du site pour la page d'index
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getSiteStatistics() {
        logger.info("Récupération des statistiques du site pour la page d'index");
        
        Map<String, Object> stats = new HashMap<>();
        
        // Nombre d'utilisateurs avec le rôle USER
        long userCount = userRepository.countByRole(Role.USER);
        stats.put("userCount", userCount);
        
        // Nombre d'agences
        long agencyCount = agencyRepository.count();
        stats.put("agencyCount", agencyCount);
        
        // Calculer le taux de satisfaction
        // Utiliser le ratio de réservations complétées par rapport aux annulées comme approximation
        long completedReservations = reservationRepository.countByStatus(Status.COMPLETED);
        long canceledReservations = reservationRepository.countByStatus(Status.CANCELED);
        
        double satisfactionRate = 0;
        if (completedReservations + canceledReservations > 0) {
            satisfactionRate = (double) completedReservations / (completedReservations + canceledReservations) * 100;
        }
        
        stats.put("satisfactionRate", Math.round(satisfactionRate * 10.0) / 10.0); // Arrondir à 1 décimale
        stats.put("support", "24/7"); // Valeur statique
        
        // Statistiques supplémentaires pour les stats cards de la page d'accueil
        long totalAgencies = agencyRepository.count();
        long totalReservations = reservationRepository.count();
        long totalServices = serviceOfferingRepository.count();
        stats.put("totalAgencies", totalAgencies);
        stats.put("totalReservations", totalReservations);
        stats.put("totalServices", totalServices);
        
        logger.info("Statistiques calculées: {} utilisateurs, {} agences, {}% satisfaction, {} réservations, {} services", 
                userCount, agencyCount, Math.round(satisfactionRate), totalReservations, totalServices);
        
        return ResponseEntity.ok(stats);
    }
}