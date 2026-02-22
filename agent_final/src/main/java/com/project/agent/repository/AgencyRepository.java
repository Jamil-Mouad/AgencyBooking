package com.project.agent.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.project.agent.model.Agency;

@Repository
public interface AgencyRepository extends JpaRepository<Agency, Long> {
    List<Agency> findByCity(String city);
    boolean existsByName(String name);
    boolean existsByPhoneNumber(String phoneNumber);
}