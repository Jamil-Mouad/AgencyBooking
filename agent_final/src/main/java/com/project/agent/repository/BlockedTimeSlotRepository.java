package com.project.agent.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.model.BlockedTimeSlot;

@Repository
public interface BlockedTimeSlotRepository extends JpaRepository<BlockedTimeSlot, Long> {
    
    /**
     * Trouve tous les créneaux bloqués pour une agence à une date spécifique
     */
    List<BlockedTimeSlot> findByAgencyAndDate(Agency agency, LocalDate date);
    
    /**
     * Trouve un créneau bloqué spécifique par agence, date et heure
     */
    Optional<BlockedTimeSlot> findByAgencyAndDateAndTime(Agency agency, LocalDate date, LocalTime time);
    
    /**
     * Trouve tous les créneaux bloqués pour une agence entre deux dates
     */
    @Query("SELECT b FROM BlockedTimeSlot b WHERE b.agency = :agency AND b.date BETWEEN :startDate AND :endDate ORDER BY b.date, b.time")
    List<BlockedTimeSlot> findByAgencyAndDateBetween(
            @Param("agency") Agency agency, 
            @Param("startDate") LocalDate startDate, 
            @Param("endDate") LocalDate endDate);
    
    /**
     * Trouve tous les créneaux bloqués par un agent spécifique
     */
    List<BlockedTimeSlot> findByBlockedBy(Agent agent);
    
    /**
     * Supprime tous les créneaux bloqués pour une agence à une date spécifique
     */
    void deleteByAgencyAndDate(Agency agency, LocalDate date);
    
    /**
     * Compte le nombre de créneaux bloqués pour une agence
     */
    long countByAgency(Agency agency);

    /**
     * Supprime tous les créneaux bloqués pour une agence
     */
    void deleteByAgency(Agency agency);
}