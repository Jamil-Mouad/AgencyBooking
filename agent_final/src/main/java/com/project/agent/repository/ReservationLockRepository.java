package com.project.agent.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.ReservationLock;

@Repository
public interface ReservationLockRepository extends JpaRepository<ReservationLock, Long> {
    /**
     * Find a lock by reservation and active status
     * @param reservation the reservation entity
     * @param active whether the lock is active
     * @return the lock if found
     */
	Optional<ReservationLock> findFirstByReservationAndActiveOrderByIdDesc(Reservation reservation, boolean active);
    /**
     * Find all active locks that have expired before a given timestamp
     * @param active whether the lock is active
     * @param expiresAt the expiration timestamp
     * @return a list of expired locks
     */
    List<ReservationLock> findByActiveAndExpiresAtBefore(boolean active, LocalDateTime expiresAt);
    void deleteByReservationIn(List<Reservation> reservations);
    void deleteByLockedBy(Agent agent);
}