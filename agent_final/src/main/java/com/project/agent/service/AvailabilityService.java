package com.project.agent.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.project.agent.dto.AvailabilityDTO;
import com.project.agent.dto.TimeSlotManagementDTO;
import com.project.agent.model.Agency;
import com.project.agent.model.Agency.BusinessHours;
import com.project.agent.model.Agent;
import com.project.agent.model.Availability;
import com.project.agent.model.BlockedTimeSlot;
import com.project.agent.model.Reservation;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.AvailabilityRepository;
import com.project.agent.repository.BlockedTimeSlotRepository;
import com.project.agent.repository.ReservationRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AvailabilityService {

    private static final Logger logger = LoggerFactory.getLogger(AvailabilityService.class);

    @Autowired
    private AvailabilityRepository availabilityRepository;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private BlockedTimeSlotRepository blockedTimeSlotRepository;
    
    @Autowired
    private AgentRepository agentRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @PersistenceContext
    private EntityManager entityManager;
    
    /**
     * Obtient ou crée les disponibilités pour une agence et une date spécifique
     */
    public Availability getOrCreateAvailability(Long agencyId, LocalDate date) {
        logger.info("Obtention des disponibilités pour l'agence {} à la date {}", agencyId, date);
        
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
                
        Optional<Availability> existingAvailability = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (existingAvailability.isPresent()) {
            logger.debug("Disponibilités existantes trouvées");
            return existingAvailability.get();
        } else {
            logger.debug("Création de nouvelles disponibilités");
            // Déterminer les créneaux horaires disponibles en fonction des heures d'ouverture
            List<LocalTime> availableSlots = generateAvailableTimeSlots(agency, date);
            
            // Obtenir les créneaux déjà réservés pour cette date
            List<LocalTime> bookedSlots = getBookedTimeSlots(agency, date);
            
            // Obtenir les créneaux manuellement bloqués
            List<LocalTime> blockedSlots = getBlockedTimeSlots(agency, date);
            
            // Filtrer les créneaux disponibles pour exclure les créneaux déjà réservés et bloqués
            availableSlots = availableSlots.stream()
                .filter(slot -> !bookedSlots.contains(slot) && !blockedSlots.contains(slot))
                .collect(Collectors.toList());
            
            // Ajouter les créneaux bloqués aux créneaux réservés pour l'affichage
            List<LocalTime> allBookedSlots = new ArrayList<>(bookedSlots);
            allBookedSlots.addAll(blockedSlots);
            
            // Créer une nouvelle disponibilité
            Availability availability = new Availability();
            availability.setAgency(agency);
            availability.setDate(date);
            availability.setAvailableTimeSlots(availableSlots);
            availability.setBookedTimeSlots(allBookedSlots);
            
            Availability savedAvailability = availabilityRepository.save(availability);
            logger.info("Nouvelles disponibilités créées pour l'agence {} à la date {}", agencyId, date);
            
            return savedAvailability;
        }
    }
    
    /**
     * Génère les créneaux horaires disponibles en fonction des heures d'ouverture de l'agence
     * avec prise en compte des créneaux passés
     */
    private List<LocalTime> generateAvailableTimeSlots(Agency agency, LocalDate date) {
        List<LocalTime> slots = new ArrayList<>();
        
        // Vérifier si la date est dans le passé
        LocalDate today = LocalDate.now();
        if (date.isBefore(today)) {
            // Retourner une liste vide pour les dates passées
            logger.debug("Date {} est dans le passé, aucun créneau disponible", date);
            return slots;
        }
        
        // Obtenir le jour de la semaine pour la date donnée
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        
        // Trouver les heures d'ouverture pour ce jour
        Optional<BusinessHours> businessHoursOpt = agency.getBusinessHours().stream()
                .filter(bh -> bh.getDay() == dayOfWeek)
                .findFirst();
        
        if (businessHoursOpt.isPresent() && !businessHoursOpt.get().isClosed()) {
            BusinessHours businessHours = businessHoursOpt.get();
            
            // Formatter pour parser les heures d'ouverture et de fermeture
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
            
            // Convertir les heures d'ouverture/fermeture en LocalTime
            LocalTime openingTime = LocalTime.parse(businessHours.getOpeningTime(), formatter);
            LocalTime closingTime = LocalTime.parse(businessHours.getClosingTime(), formatter);
            
            // Pour aujourd'hui, ne pas proposer les heures déjà passées
            LocalTime currentTime = null;
            if (date.isEqual(today)) {
                currentTime = LocalTime.now();
                // Arrondir à l'heure suivante pour avoir une marge
                currentTime = currentTime.plusHours(1).withMinute(0).withSecond(0).withNano(0);
                logger.debug("Heure actuelle arrondie à l'heure suivante: {}", currentTime);
            }
            
            // Générer des créneaux d'une heure
            LocalTime slotTime = openingTime;
            while (slotTime.isBefore(closingTime)) {
                // Pour aujourd'hui, ignorer les créneaux déjà passés
                if (currentTime == null || !slotTime.isBefore(currentTime)) {
                    slots.add(slotTime);
                } else {
                    logger.debug("Créneau {} ignoré car déjà passé", slotTime);
                }
                slotTime = slotTime.plusHours(1);
            }
        }
        
        return slots;
    }
    
    /**
     * Obtient les créneaux déjà réservés pour cette agence et cette date
     */
    private List<LocalTime> getBookedTimeSlots(Agency agency, LocalDate date) {
        List<Reservation> reservations = reservationRepository.findByAgencyAndStatus(agency, Reservation.Status.CONFIRMED);
        
        // Filtrer les réservations pour cette date et extraire l'heure
        return reservations.stream()
                .filter(res -> res.getStartDateTime() != null)
                .filter(res -> res.getStartDateTime().toLocalDate().equals(date))
                .map(res -> res.getStartDateTime().toLocalTime())
                .collect(Collectors.toList());
    }
    
    /**
     * Obtient les créneaux manuellement bloqués par les agents
     */
    private List<LocalTime> getBlockedTimeSlots(Agency agency, LocalDate date) {
        List<BlockedTimeSlot> blockedSlots = blockedTimeSlotRepository.findByAgencyAndDate(agency, date);
        
        return blockedSlots.stream()
                .map(BlockedTimeSlot::getTime)
                .collect(Collectors.toList());
    }
    
    /**
     * Met à jour les disponibilités après une réservation confirmée
     */
    @Transactional
    public void updateAvailabilityAfterReservation(Reservation reservation) {
        logger.info("Mise à jour des disponibilités après la réservation {}", reservation.getId());
        
        if (reservation.getStartDateTime() != null && reservation.getStatus() == Reservation.Status.CONFIRMED) {
            LocalDate date = reservation.getStartDateTime().toLocalDate();
            LocalTime time = reservation.getStartDateTime().toLocalTime();
            Agency agency = reservation.getAgency();
            
            Optional<Availability> availabilityOpt = availabilityRepository.findByAgencyAndDate(agency, date);
            
            Availability availability;
            if (availabilityOpt.isPresent()) {
                availability = availabilityOpt.get();
                logger.debug("Disponibilités existantes trouvées, mise à jour");
                
                // Ajouter le temps aux créneaux réservés
                if (!availability.getBookedTimeSlots().contains(time)) {
                    List<LocalTime> bookedSlots = availability.getBookedTimeSlots();
                    bookedSlots.add(time);
                    availability.setBookedTimeSlots(bookedSlots);
                }
                
                // Supprimer des créneaux disponibles si présent
                List<LocalTime> availableSlots = availability.getAvailableTimeSlots();
                availableSlots.remove(time);
                availability.setAvailableTimeSlots(availableSlots);
                
            } else {
                logger.debug("Aucune disponibilité existante, création d'une nouvelle");
                // Créer une nouvelle disponibilité si elle n'existe pas encore
                availability = new Availability();
                availability.setAgency(agency);
                availability.setDate(date);
                
                List<LocalTime> availableSlots = generateAvailableTimeSlots(agency, date);
                availableSlots.remove(time);
                availability.setAvailableTimeSlots(availableSlots);
                
                List<LocalTime> bookedSlots = new ArrayList<>();
                bookedSlots.add(time);
                availability.setBookedTimeSlots(bookedSlots);
            }
            
            Availability savedAvailability = availabilityRepository.saveAndFlush(availability);
            logger.info("Disponibilités mises à jour et enregistrées pour l'agence {} à la date {}", agency.getId(), date);
            
            // Envoyer une notification WebSocket pour informer les clients
            logger.debug("Envoi de notification WebSocket pour mise à jour des disponibilités");
            messagingTemplate.convertAndSend("/topic/availability/" + agency.getId(), savedAvailability);
        } else {
            logger.warn("Impossible de mettre à jour les disponibilités: date de début manquante ou statut non confirmé");
        }
    }
    
    /**
     * Bloque un créneau horaire manuellement
     */
    @Transactional
    public void blockTimeSlot(Long agencyId, LocalDate date, LocalTime time, String reason) {
        logger.info("Blocage manuel du créneau pour l'agence {}, date {} à {}", agencyId, date, time);
        
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        // Vérifier si le créneau peut être bloqué (pas déjà réservé)
        List<Reservation> conflictingReservations = reservationRepository.findByAgencyAndStartDateTimeBetween(
                agency, 
                date.atTime(time), 
                date.atTime(time).plusHours(1)
        );
        
        if (!conflictingReservations.isEmpty()) {
            throw new RuntimeException("Impossible de bloquer ce créneau: il est déjà réservé");
        }
        
        // Vérifier si le créneau est déjà bloqué
        Optional<BlockedTimeSlot> existingBlock = blockedTimeSlotRepository.findByAgencyAndDateAndTime(agency, date, time);
        if (existingBlock.isPresent()) {
            throw new RuntimeException("Ce créneau est déjà bloqué");
        }
        
        // Obtenir l'agent qui effectue le blocage
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Agent agent = agentRepository.findByUser_Email(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        // Créer un nouveau créneau bloqué
        BlockedTimeSlot blockedSlot = new BlockedTimeSlot();
        blockedSlot.setAgency(agency);
        blockedSlot.setDate(date);
        blockedSlot.setTime(time);
        blockedSlot.setReason(reason);
        blockedSlot.setBlockedBy(agent);
        blockedSlot.setBlockedAt(LocalDateTime.now());
        
        blockedTimeSlotRepository.save(blockedSlot);
        
        // Mettre à jour les disponibilités
        Optional<Availability> availabilityOpt = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (availabilityOpt.isPresent()) {
            Availability availability = availabilityOpt.get();
            
            // Retirer des créneaux disponibles
            List<LocalTime> availableSlots = availability.getAvailableTimeSlots();
            availableSlots.remove(time);
            availability.setAvailableTimeSlots(availableSlots);
            
            // Ajouter aux créneaux réservés (pour l'affichage)
            List<LocalTime> bookedSlots = availability.getBookedTimeSlots();
            if (!bookedSlots.contains(time)) {
                bookedSlots.add(time);
                availability.setBookedTimeSlots(bookedSlots);
            }
            
            availabilityRepository.save(availability);
        } else {
            // Créer une nouvelle disponibilité si nécessaire
            Availability availability = new Availability();
            availability.setAgency(agency);
            availability.setDate(date);
            
            List<LocalTime> availableSlots = generateAvailableTimeSlots(agency, date);
            availableSlots.remove(time);
            availability.setAvailableTimeSlots(availableSlots);
            
            List<LocalTime> bookedSlots = new ArrayList<>();
            bookedSlots.add(time);
            availability.setBookedTimeSlots(bookedSlots);
            
            availabilityRepository.save(availability);
        }
        
        // Notifier via WebSocket
        AvailabilityDTO dto = new AvailabilityDTO(getOrCreateAvailability(agencyId, date));
        enrichAvailabilityDTO(dto);
        messagingTemplate.convertAndSend("/topic/availability/" + agencyId, dto);
        
        // Notifier spécifiquement du blocage
        TimeSlotManagementDTO managementDto = new TimeSlotManagementDTO();
        managementDto.setAgencyId(agencyId);
        managementDto.setDate(date);
        managementDto.setTime(time);
        managementDto.setBlocked(true);
        managementDto.setReason(reason);
        managementDto.setAgentName(agent.getUsername());
        
        messagingTemplate.convertAndSend("/topic/timeslot-management", managementDto);
    }
    
    /**
     * Débloque un créneau horaire précédemment bloqué
     */
    @Transactional
    public void unblockTimeSlot(Long agencyId, LocalDate date, LocalTime time) {
        logger.info("Déblocage du créneau pour l'agence {}, date {} à {}", agencyId, date, time);
        
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        // Vérifier si le créneau est bien bloqué
        BlockedTimeSlot blockedSlot = blockedTimeSlotRepository.findByAgencyAndDateAndTime(agency, date, time)
                .orElseThrow(() -> new RuntimeException("Ce créneau n'est pas bloqué manuellement"));
        
        // Supprimer le blocage
        blockedTimeSlotRepository.delete(blockedSlot);
        
        // Obtenir l'agent qui effectue le déblocage (pour les logs)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Agent agent = agentRepository.findByUser_Email(email)
                .orElseThrow(() -> new RuntimeException("Agent non trouvé"));
        
        // Mettre à jour les disponibilités
        Optional<Availability> availabilityOpt = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (availabilityOpt.isPresent()) {
            Availability availability = availabilityOpt.get();
            
            // Vérifier si ce créneau n'est pas déjà réservé par une réservation confirmée
            boolean isAlreadyBooked = reservationRepository.findByAgencyAndStartDateTimeBetween(
                    agency, 
                    date.atTime(time), 
                    date.atTime(time).plusHours(1)
            ).stream().anyMatch(res -> res.getStatus() == Reservation.Status.CONFIRMED);
            
            if (!isAlreadyBooked) {
                // Ajouter aux créneaux disponibles si dans les heures d'ouverture et pas déjà passé
                if (isWithinBusinessHours(agency, date, time) && !isPastTimeSlot(date, time)) {
                    List<LocalTime> availableSlots = availability.getAvailableTimeSlots();
                    if (!availableSlots.contains(time)) {
                        availableSlots.add(time);
                        // Trier pour un affichage cohérent
                        availableSlots.sort(LocalTime::compareTo);
                        availability.setAvailableTimeSlots(availableSlots);
                    }
                }
                
                // Retirer des créneaux réservés s'il n'est pas réservé par ailleurs
                List<LocalTime> bookedSlots = availability.getBookedTimeSlots();
                bookedSlots.remove(time);
                availability.setBookedTimeSlots(bookedSlots);
            }
            
            availabilityRepository.save(availability);
        }
        
        // Notifier via WebSocket
        AvailabilityDTO dto = new AvailabilityDTO(getOrCreateAvailability(agencyId, date));
        enrichAvailabilityDTO(dto);
        messagingTemplate.convertAndSend("/topic/availability/" + agencyId, dto);
        
        // Notifier spécifiquement du déblocage
        TimeSlotManagementDTO managementDto = new TimeSlotManagementDTO();
        managementDto.setAgencyId(agencyId);
        managementDto.setDate(date);
        managementDto.setTime(time);
        managementDto.setBlocked(false);
        managementDto.setAgentName(agent.getUsername());
        
        messagingTemplate.convertAndSend("/topic/timeslot-management", managementDto);
    }
    
    /**
     * Vérifie si un créneau horaire est dans les heures d'ouverture de l'agence
     */
    private boolean isWithinBusinessHours(Agency agency, LocalDate date, LocalTime time) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        
        Optional<BusinessHours> businessHoursOpt = agency.getBusinessHours().stream()
                .filter(bh -> bh.getDay() == dayOfWeek)
                .findFirst();
        
        if (businessHoursOpt.isPresent() && !businessHoursOpt.get().isClosed()) {
            BusinessHours businessHours = businessHoursOpt.get();
            
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
            LocalTime openingTime = LocalTime.parse(businessHours.getOpeningTime(), formatter);
            LocalTime closingTime = LocalTime.parse(businessHours.getClosingTime(), formatter);
            
            return !time.isBefore(openingTime) && time.isBefore(closingTime);
        }
        
        return false;
    }
    
    /**
     * Vérifie si un créneau horaire est dans le passé
     */
    private boolean isPastTimeSlot(LocalDate date, LocalTime time) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        
        if (date.isBefore(today)) {
            return true;
        }
        
        if (date.isEqual(today) && time.isBefore(now)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Marque un créneau horaire comme temporairement réservé
     */
    @Transactional
    public void markTimeSlotAsTemporarilyBooked(Agency agency, LocalDateTime dateTime) {
        logger.info("Marquage du créneau comme temporairement réservé: agence {}, date/heure {}", agency.getId(), dateTime);
        
        LocalDate date = dateTime.toLocalDate();
        LocalTime time = dateTime.toLocalTime();
        
        // Important: utiliser JPA flush pour garantir la persistance immédiate
        Availability availability;
        Optional<Availability> availabilityOpt = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (availabilityOpt.isPresent()) {
            availability = availabilityOpt.get();
            logger.debug("Disponibilités existantes trouvées");
            
            // Retirer des créneaux disponibles
            List<LocalTime> availableSlots = availability.getAvailableTimeSlots();
            boolean removed = availableSlots.remove(time);
            logger.debug("Créneau retiré des disponibles: {}", removed);
            availability.setAvailableTimeSlots(availableSlots);
            
            // Ajouter aux créneaux temporairement réservés
            List<LocalTime> tempBookedSlots = new ArrayList<>(availability.getBookedTimeSlots());
            if (!tempBookedSlots.contains(time)) {
                tempBookedSlots.add(time);
                availability.setBookedTimeSlots(tempBookedSlots);
                logger.debug("Créneau ajouté aux réservés temporairement");
            }
            
            // Sauvegarder et flush immédiatement
            availability = availabilityRepository.saveAndFlush(availability);
            
            // Envoyer notification WebSocket immédiatement
            logger.debug("Envoi de notification WebSocket pour mise à jour des disponibilités");
            messagingTemplate.convertAndSend("/topic/availability/" + agency.getId(), availability);
        } else {
            logger.debug("Aucune disponibilité existante pour cette date, création d'une nouvelle");
            availability = getOrCreateAvailability(agency.getId(), date);
            
            // Appliquer à nouveau le marquage maintenant que la disponibilité existe
            markTimeSlotAsTemporarilyBooked(agency, dateTime);
        }
    }
    
    /**
     * Libère un créneau horaire temporairement réservé
     */
    @Transactional
    public void releaseTimeSlot(Agency agency, LocalDateTime dateTime) {
        logger.info("Libération du créneau: agence {}, date/heure {}", agency.getId(), dateTime);
        
        LocalDate date = dateTime.toLocalDate();
        LocalTime time = dateTime.toLocalTime();
        
        Optional<Availability> availabilityOpt = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (availabilityOpt.isPresent()) {
            Availability availability = availabilityOpt.get();
            
            // Retirer des créneaux réservés
            List<LocalTime> bookedSlots = availability.getBookedTimeSlots();
            boolean removed = bookedSlots.remove(time);
            logger.debug("Créneau retiré des réservés: {}", removed);
            availability.setBookedTimeSlots(bookedSlots);
            
            // Ajouter aux créneaux disponibles s'il n'y est pas déjà
            List<LocalTime> availableSlots = availability.getAvailableTimeSlots();
            if (!availableSlots.contains(time)) {
                availableSlots.add(time);
                // Trier les créneaux disponibles
                availableSlots.sort(LocalTime::compareTo);
                availability.setAvailableTimeSlots(availableSlots);
                logger.debug("Créneau rajouté aux disponibles");
            }
            
            Availability savedAvailability = availabilityRepository.saveAndFlush(availability);
            
            // Envoyer notification WebSocket immédiatement
            logger.debug("Envoi de notification WebSocket pour mise à jour des disponibilités");
            messagingTemplate.convertAndSend("/topic/availability/" + agency.getId(), savedAvailability);
        } else {
            logger.warn("Aucune disponibilité trouvée pour cette date et cette agence");
        }
    }
    
    /**
     * Récupère les disponibilités pour une semaine
     */
    public List<Availability> getAgencyAvailabilityForWeek(Long agencyId, LocalDate startDate) {
        logger.info("Récupération des disponibilités pour la semaine du {} pour l'agence {}", startDate, agencyId);
        
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        List<Availability> weekAvailability = new ArrayList<>();
        
        // Créer ou récupérer les disponibilités pour les 7 jours à partir de startDate
        for (int i = 0; i < 7; i++) {
            LocalDate date = startDate.plusDays(i);
            weekAvailability.add(getOrCreateAvailability(agencyId, date));
        }
        
        return weekAvailability;
    }
    
    /**
     * Récupère la dernière version d'une disponibilité depuis la base de données
     */
    @Transactional
    public Availability refreshAvailability(Long agencyId, LocalDate date) {
        logger.info("Rafraîchissement des disponibilités pour l'agence {} à la date {}", agencyId, date);
        
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        // Forcer une requête fraîche à la base de données
        entityManager.clear();
        
        Optional<Availability> refreshedAvailability = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (refreshedAvailability.isPresent()) {
            return refreshedAvailability.get();
        } else {
            return getOrCreateAvailability(agencyId, date);
        }
    }
    
    /**
     * Enrichit un DTO de disponibilité avec des informations supplémentaires
     */
    public void enrichAvailabilityDTO(AvailabilityDTO dto) {
        // Trouver les réservations confirmées pour les créneaux réservés
        Agency agency = agencyRepository.findById(dto.getAgencyId())
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        LocalDate date = dto.getDate();
        
        // Pour chaque créneau réservé, ajouter des informations sur la réservation
        for (LocalTime time : dto.getBookedTimeSlots()) {
            LocalDateTime dateTime = date.atTime(time);
            
            // Vérifier si c'est une réservation ou un blocage manuel
            Optional<BlockedTimeSlot> blockedSlot = blockedTimeSlotRepository.findByAgencyAndDateAndTime(agency, date, time);
            
            if (blockedSlot.isPresent()) {
                // C'est un blocage manuel
                String timeKey = time.toString();
                String reason = blockedSlot.get().getReason();
                if (reason != null && !reason.isEmpty()) {
                    dto.getBookedSlotInfo().put(timeKey, "Bloqué: " + reason);
                } else {
                    dto.getBookedSlotInfo().put(timeKey, "Créneau bloqué");
                }
            } else {
                // Chercher une réservation confirmée
                List<Reservation> reservations = reservationRepository.findByAgencyAndStatus(
                        agency, Reservation.Status.CONFIRMED).stream()
                        .filter(res -> res.getStartDateTime() != null && 
                                      res.getStartDateTime().toLocalDate().equals(date) && 
                                      res.getStartDateTime().toLocalTime().equals(time))
                        .collect(Collectors.toList());
                
                if (!reservations.isEmpty()) {
                    // Ajouter des informations non sensibles sur la réservation
                    Reservation reservation = reservations.get(0);
                    String timeKey = time.toString();
                    
                    dto.getBookedSlotInfo().put(timeKey, "Réservé pour: " + reservation.getService());
                }
            }
        }
    }
    
    /**
     * Vérifie si un créneau horaire spécifique est disponible
     */
    public boolean isTimeSlotAvailable(Long agencyId, LocalDate date, LocalTime time) {
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        // Vérifier si la date est dans le passé
        if (date.isBefore(LocalDate.now())) {
            return false;
        }
        
        // Vérifier si c'est aujourd'hui et si l'heure est déjà passée
        if (date.equals(LocalDate.now()) && time.isBefore(LocalTime.now())) {
            return false;
        }
        
        // Vérifier les heures d'ouverture de l'agence pour ce jour
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        Optional<BusinessHours> businessHours = agency.getBusinessHours().stream()
                .filter(bh -> bh.getDay() == dayOfWeek)
                .findFirst();
        
        // Si l'agence est fermée ce jour-là ou si aucune heure d'ouverture n'est définie
        if (businessHours.isEmpty() || businessHours.get().isClosed()) {
            return false;
        }
        
        // Vérifier si le créneau est dans les heures d'ouverture
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalTime openingTime = LocalTime.parse(businessHours.get().getOpeningTime(), formatter);
        LocalTime closingTime = LocalTime.parse(businessHours.get().getClosingTime(), formatter);
        
        if (time.isBefore(openingTime) || !time.isBefore(closingTime)) {
            return false;
        }
        
        // Vérifier si le créneau est déjà réservé
        boolean isBooked = reservationRepository.findByAgencyAndStartDateTimeBetween(
                agency, 
                date.atTime(time), 
                date.atTime(time).plusHours(1)
        ).stream().anyMatch(res -> res.getStatus() == Reservation.Status.CONFIRMED);
        
        if (isBooked) {
            return false;
        }
        
        // Vérifier si le créneau est bloqué manuellement
        boolean isBlocked = blockedTimeSlotRepository.findByAgencyAndDateAndTime(agency, date, time).isPresent();
        
        if (isBlocked) {
            return false;
        }
        
        // Vérifier les disponibilités existantes
        Optional<Availability> availabilityOpt = availabilityRepository.findByAgencyAndDate(agency, date);
        
        if (availabilityOpt.isPresent()) {
            Availability availability = availabilityOpt.get();
            
            // Vérifier si le créneau est disponible
            return availability.getAvailableTimeSlots().contains(time) &&
                  !availability.getBookedTimeSlots().contains(time);
        } else {
            // Si aucune disponibilité n'existe, générer les créneaux disponibles
            List<LocalTime> availableSlots = generateAvailableTimeSlots(agency, date);
            return availableSlots.contains(time);
        }
    }
}