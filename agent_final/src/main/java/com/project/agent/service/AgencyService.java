package com.project.agent.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.model.Reservation;
import com.project.agent.model.ServiceOffering;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.AvailabilityRepository;
import com.project.agent.repository.BlockedTimeSlotRepository;
import com.project.agent.repository.ReservationLockRepository;
import com.project.agent.repository.ReservationRepository;

@Service
public class AgencyService {

    @Autowired
    private AgencyRepository agencyRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private ServiceOfferingService serviceOfferingService;

    @Autowired
    private AvailabilityRepository availabilityRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private ReservationLockRepository reservationLockRepository;

    @Autowired
    private BlockedTimeSlotRepository blockedTimeSlotRepository;
    // Get all agencies
    public List<Agency> getAllAgencies() {
        return agencyRepository.findAll();
    }
    
    // Get agency by ID
    public Agency getAgencyById(Long id) {
        return agencyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agency not found with id " + id));
    }
    
    // Create agency
    @Transactional
    public Agency createAgency(Agency agency, List<Integer> serviceIds) {
        // Check if agency with this name already exists
        if (agencyRepository.existsByName(agency.getName())) {
            throw new RuntimeException("Agency with this name already exists");
        }
        
        // Check if agency with this phone number already exists
        if (agencyRepository.existsByPhoneNumber(agency.getPhoneNumber())) {
            throw new RuntimeException("Agency with this phone number already exists");
        }
        if (serviceIds != null && !serviceIds.isEmpty()) {
            List<ServiceOffering> services = serviceIds.stream()
                .map(id -> serviceOfferingService.getServiceById(id.shortValue()))
                .collect(Collectors.toList());
            agency.setServices(services);
        }

        return agencyRepository.saveAndFlush(agency);
    }

    // Update agency
    @Transactional
    public Agency updateAgency(Long id, Agency agencyDetails, List<Integer> serviceIds) {
        Agency agency = getAgencyById(id);
        
        // Check if name is being changed and if it conflicts with an existing agency
        if (!agency.getName().equals(agencyDetails.getName()) && 
            agencyRepository.existsByName(agencyDetails.getName())) {
            throw new RuntimeException("Agency with this name already exists");
        }
        
        // Check if phone number is being changed and if it conflicts with an existing agency
        if (!agency.getPhoneNumber().equals(agencyDetails.getPhoneNumber()) && 
            agencyRepository.existsByPhoneNumber(agencyDetails.getPhoneNumber())) {
            throw new RuntimeException("Une agence avec ce numéro de téléphone existe déjà");
        }
        
        
        // Update fields
        agency.setName(agencyDetails.getName());
        agency.setAddress(agencyDetails.getAddress());
        agency.setPhoneNumber(agencyDetails.getPhoneNumber());
        agency.setEmail(agencyDetails.getEmail());
        agency.setDescription(agencyDetails.getDescription());
        agency.setCity(agencyDetails.getCity());
        agency.setBusinessHours(agencyDetails.getBusinessHours());
        if (serviceIds != null) {
            List<ServiceOffering> services = serviceIds.stream()
                .map(sid -> serviceOfferingService.getServiceById(sid.shortValue()))
                .collect(Collectors.toList());
            agency.getServices().clear();
            agency.getServices().addAll(services);
        }
        
        return agencyRepository.save(agency);
    }
    
    // Delete agency (cascade: clean up all FK references)
    @Transactional
    public void deleteAgency(Long id) {
        Agency agency = getAgencyById(id);

        // 1. Delete all blocked time slots for this agency
        blockedTimeSlotRepository.deleteByAgency(agency);

        // 2. Delete all availability records for this agency
        availabilityRepository.deleteAll(availabilityRepository.findByAgency(agency));

        // 3. Handle reservations: nullify handledByAgent for agents of this agency,
        //    delete reservation locks, then delete reservations
        List<Agent> agents = agentRepository.findByAgency(agency);
        for (Agent agent : agents) {
            List<Reservation> handledReservations = reservationRepository.findByHandledByAgent(agent);
            for (Reservation r : handledReservations) {
                r.setHandledByAgent(null);
                reservationRepository.save(r);
            }
        }

        List<Reservation> agencyReservations = reservationRepository.findByAgency(agency);
        if (!agencyReservations.isEmpty()) {
            reservationLockRepository.deleteByReservationIn(agencyReservations);
            reservationRepository.deleteAll(agencyReservations);
        }

        // 4. Disassociate all agents from this agency
        for (Agent agent : agents) {
            agent.setAgency(null);
            agentRepository.save(agent);
        }

        // 5. Clear services join table
        agency.getServices().clear();
        agencyRepository.save(agency);

        // 6. Delete the agency
        agencyRepository.delete(agency);
    }
    
    // Assign agent to agency
    public Agent assignAgentToAgency(Long agencyId, Long agentId) {
        Agency agency = getAgencyById(agencyId);
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found with id " + agentId));
        
        agent.setAgency(agency);
        return agentRepository.save(agent);
    }
    
    // Remove agent from agency
    public Agent removeAgentFromAgency(Long agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found with id " + agentId));
        
        agent.setAgency(null);
        return agentRepository.save(agent);
    }
    
    // Get all agents of an agency
    public List<Agent> getAgencyAgents(Long agencyId) {
        Agency agency = getAgencyById(agencyId);
        return agentRepository.findByAgency(agency);
    }
}