package com.project.agent.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

//import com.project.agent.model.Reservation;
import com.project.agent.model.ReservationFeedback;
import com.project.agent.model.Users;

@Repository
public interface ReservationFeedbackRepository extends JpaRepository<ReservationFeedback, Long> {
    Optional<ReservationFeedback> findByReservationId(Long reservationId);
    List<ReservationFeedback> findByReservation_User(Users user);
    boolean existsByReservationId(Long reservationId);
    Page<ReservationFeedback> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    // Compter les feedbacks par note
    @Query("SELECT f.rating as rating, COUNT(f) as count FROM ReservationFeedback f GROUP BY f.rating ORDER BY f.rating DESC")
    List<Object[]> countByRatingGrouped();
    
    // Calculer la note moyenne
    @Query("SELECT AVG(f.rating) FROM ReservationFeedback f")
    Double calculateAverageRating();
    
    // Récupérer les témoignages les plus récents avec commentaires non vides
    @Query("SELECT f FROM ReservationFeedback f WHERE f.comment IS NOT NULL AND LENGTH(f.comment) > 10 ORDER BY f.createdAt DESC")
    Page<ReservationFeedback> findTestimonials(Pageable pageable);
}

