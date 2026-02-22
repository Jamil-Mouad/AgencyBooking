package com.project.agent.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.project.agent.model.Agency;
import com.project.agent.model.Availability;

@Repository
public interface AvailabilityRepository extends JpaRepository<Availability, Long> {
    List<Availability> findByDate(LocalDate date);
    List<Availability> findByAgency(Agency agency);
    List<Availability> findByAgencyAndDateGreaterThanEqual(Agency agency, LocalDate date);
    Optional<Availability> findByAgencyAndDate(Agency agency, LocalDate date);
    boolean existsByAgencyAndDate(Agency agency, LocalDate date);
    List<Availability> findByDateBefore(LocalDate date);
}