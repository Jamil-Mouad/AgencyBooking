package com.project.agent.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;

@Entity
@Data
public class ReservationLock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Reservation reservation;

    @ManyToOne
    private Agent lockedBy;
    
    private LocalDateTime lockedAt;
    
    private LocalDateTime expiresAt;
    
    private boolean active;
    
    // Méthode utilitaire pour vérifier si le verrou est expiré
    public boolean isExpired() {
        return !active || expiresAt.isBefore(LocalDateTime.now());
    }
}