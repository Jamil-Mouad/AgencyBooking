package com.project.agent.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.project.agent.model.Agent;
import com.project.agent.model.Agency;
import com.project.agent.model.Users;

@Repository
public interface AgentRepository extends JpaRepository<Agent, Long> {
	
    Optional<Agent> findByUser(Users user);
    Optional<Agent> findByUser_Email(String email);
    boolean existsByUser_Email(String email);
	List<Agent> findByAgency(Agency agency);
}