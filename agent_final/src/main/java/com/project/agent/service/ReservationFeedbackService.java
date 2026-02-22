package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.project.agent.model.Reservation;
import com.project.agent.model.ReservationFeedback;
import com.project.agent.model.Users;
import com.project.agent.repository.ReservationFeedbackRepository;
import com.project.agent.repository.ReservationRepository;
import com.project.agent.repository.UserRepository;

@Service
public class ReservationFeedbackService {
    
    @Autowired
    private ReservationFeedbackRepository feedbackRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    // Méthodes existantes...
    
    /**
     * Crée un nouveau feedback pour une réservation
     */
    @Transactional
    public ReservationFeedback createFeedback(Long reservationId, String comment, Integer rating) {
        // Obtenir l'utilisateur actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Vérifier la réservation
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation non trouvée"));
        
        // Vérifier que la réservation appartient à l'utilisateur
        if (!reservation.getUser().equals(user)) {
            throw new RuntimeException("Vous n'êtes pas autorisé à ajouter un avis pour cette réservation");
        }
        
        // Vérifier que la réservation est terminée
        if (reservation.getStatus() != Reservation.Status.COMPLETED) {
            throw new RuntimeException("Vous ne pouvez ajouter un avis que pour des réservations terminées");
        }
        
        // Vérifier si un avis existe déjà
        if (feedbackRepository.existsByReservationId(reservationId)) {
            throw new RuntimeException("Vous avez déjà ajouté un avis pour cette réservation");
        }
        
        // Créer et enregistrer le feedback
        ReservationFeedback feedback = new ReservationFeedback();
        feedback.setReservation(reservation);
        feedback.setComment(comment);
        feedback.setRating(rating);
        feedback.setCreatedAt(LocalDateTime.now());
        
        return feedbackRepository.save(feedback);
    }
    
    /**
     * Obtient le feedback pour une réservation spécifique
     */
    public Optional<ReservationFeedback> getFeedbackForReservation(Long reservationId) {
        return feedbackRepository.findByReservationId(reservationId);
    }
    
    /**
     * Obtient tous les feedbacks laissés par un utilisateur
     */
    public List<ReservationFeedback> getUserFeedbacks() {
        // Obtenir l'utilisateur actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        return feedbackRepository.findByReservation_User(user);
    }
    
    // Nouvelles méthodes pour la page d'index
    
    /**
     * Récupère les feedback récents avec pagination pour affichage public
     */
    public Page<ReservationFeedback> getRecentFeedback(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return feedbackRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
    
    /**
     * Récupère les témoignages (feedbacks avec commentaires substantiels)
     */
    public Page<ReservationFeedback> getTestimonials(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return feedbackRepository.findTestimonials(pageable);
    }
    
    /**
     * Récupère les statistiques des feedbacks pour affichage public
     */
    public Map<String, Object> getFeedbackStatistics() {
        Map<String, Object> statistics = new HashMap<>();
        
        // Récupérer la note moyenne
        Double avgRating = feedbackRepository.calculateAverageRating();
        statistics.put("average", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        
        // Récupérer le nombre total
        long totalCount = feedbackRepository.count();
        statistics.put("count", totalCount);
        
        // Récupérer la distribution par note
        List<Object[]> ratingDistribution = feedbackRepository.countByRatingGrouped();
        Map<Integer, Long> distribution = new HashMap<>();
        
        // Initialiser toutes les notes à 0
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }
        
        // Mettre à jour avec les comptages réels
        for (Object[] result : ratingDistribution) {
            Integer rating = ((Number) result[0]).intValue();
            Long count = ((Number) result[1]).longValue();
            distribution.put(rating, count);
        }
        
        // Calculer les pourcentages
        Map<Integer, Double> percentages = new HashMap<>();
        if (totalCount > 0) {
            for (int i = 1; i <= 5; i++) {
                double percentage = (distribution.get(i) * 100.0) / totalCount;
                percentages.put(i, Math.round(percentage * 10.0) / 10.0);  // Arrondir à 1 décimale
            }
        } else {
            for (int i = 1; i <= 5; i++) {
                percentages.put(i, 0.0);
            }
        }
        
        // Calculer le nombre d'étoiles complètes et demies
        int fullStars = (int) Math.floor(avgRating != null ? avgRating : 0);
        boolean hasHalfStar = avgRating != null && (avgRating % 1) >= 0.5;
        
        statistics.put("distribution", percentages);
        statistics.put("fullStars", fullStars);
        statistics.put("hasHalfStar", hasHalfStar);
        
        return statistics;
    }
}