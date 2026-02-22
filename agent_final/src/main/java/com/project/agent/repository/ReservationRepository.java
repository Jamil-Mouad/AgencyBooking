package com.project.agent.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.Reservation.Status;
import com.project.agent.model.Users;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUser(Users user);
    List<Reservation> findByStatus(Status status);
    List<Reservation> findByAgency(Agency agency);
    List<Reservation> findByAgencyAndStatus(Agency agency, Status status);
    List<Reservation> findByUserAndStatusIn(Users user, List<Status> statuses);
    List<Reservation> findByHandledByAgent(Agent agent);
    List<Reservation> findByHandledByAgentAndUpdatedAtAfter(Agent agent, LocalDateTime date);
    List<Reservation> findByStatusAndStartDateTimeBetween(Status status, LocalDateTime start, LocalDateTime end);
    List<Reservation> findByStatusAndCreatedAtBefore(Status status, LocalDateTime date);
    List<Reservation> findByStatusAndStartDateTimeBetweenAndReminderSentFalse(Status status, LocalDateTime start, LocalDateTime end);
    List<Reservation> findByStatusAndStartDateTimeBetweenAndShortReminderSentFalse(
        Status status, LocalDateTime start, LocalDateTime end);
    
    /**
     * Trouve toutes les réservations pour une agence dont la date/heure de début se trouve dans un intervalle
     * @param agency L'agence concernée
     * @param start Le début de l'intervalle
     * @param end La fin de l'intervalle
     * @return Liste des réservations correspondantes
     */
    List<Reservation> findByAgencyAndStartDateTimeBetween(Agency agency, LocalDateTime start, LocalDateTime end);
    
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    long countByStatus(Status status);
    
    // Nouvelles méthodes pour les statistiques utilisateur
    long countByUser(Users user);
    long countByUserAndStatus(Users user, Status status);
    
    /**
     * Trouve les agences distinctes visitées par un utilisateur (réservations terminées)
     */
    @Query("SELECT DISTINCT r.agency FROM Reservation r WHERE r.user = ?1 AND r.status = 'COMPLETED'")
    List<Agency> findDistinctAgenciesByUserAndStatusCompleted(Users user);
}