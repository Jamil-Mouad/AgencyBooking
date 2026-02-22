package com.project.agent.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "reservation_feedback")
@Data
@EntityListeners(AuditingEntityListener.class)
public class ReservationFeedback {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "reservation_id", unique = true)
    private Reservation reservation;
    
    @Column(length = 1000)
    private String comment;
    
    @Column
    private Integer rating; // 1-5 star rating
    
    @CreatedDate
    @Column(nullable = false)
    private LocalDateTime createdAt;
}