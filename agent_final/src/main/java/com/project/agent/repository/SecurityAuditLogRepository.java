package com.project.agent.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.project.agent.model.SecurityAuditLog;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, Long> {
    List<SecurityAuditLog> findByUserEmail(String userEmail);
    List<SecurityAuditLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);
    List<SecurityAuditLog> findByAction(String action);
    List<SecurityAuditLog> findByResourceTypeAndResourceId(String resourceType, String resourceId);
    List<SecurityAuditLog> findByActionAndTimestampBetween(String action, LocalDateTime start, LocalDateTime end);

}