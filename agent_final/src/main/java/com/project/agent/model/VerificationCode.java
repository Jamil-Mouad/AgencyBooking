package com.project.agent.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class VerificationCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String code;
    
    @ManyToOne
    private Users user;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime expiresAt;
    
    private boolean used;
    
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}