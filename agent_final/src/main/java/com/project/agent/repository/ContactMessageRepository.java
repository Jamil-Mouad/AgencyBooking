package com.project.agent.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.project.agent.model.ContactMessage;
import com.project.agent.model.Users;

@Repository
public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {
    List<ContactMessage> findByUserOrderByCreatedAtDesc(Users user);
    List<ContactMessage> findByReadOrderByCreatedAtDesc(boolean read);
    List<ContactMessage> findAllByOrderByCreatedAtDesc();
    long countByUserAndRead(Users user, boolean read);
    void deleteByUser(Users user);
}