package com.project.agent.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.project.agent.model.VerificationCode;
import com.project.agent.model.Users;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findByCodeAndUser(String code, Users user);
    Optional<VerificationCode> findByUserAndUsed(Users user, boolean used);
    void deleteByUser(Users user);}