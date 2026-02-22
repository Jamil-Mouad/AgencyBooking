package com.project.agent.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.project.agent.dto.AgencyRequest;
import com.project.agent.dto.ApiResponse;
import com.project.agent.model.Agency;
import com.project.agent.model.Agent;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.service.AgencyService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/agencies")
public class AgencyController {

    @Autowired
    private AgencyService agencyService;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    // Get all agencies (public endpoint)
    @GetMapping
    public ResponseEntity<List<Agency>> getAllAgencies() {
        List<Agency> agencies = agencyService.getAllAgencies();
        return ResponseEntity.ok(agencies);
    }
    
    // Get agency by ID
    @GetMapping("/{id}")
    public ResponseEntity<Agency> getAgencyById(@PathVariable Long id) {
        Agency agency = agencyService.getAgencyById(id);
        return ResponseEntity.ok(agency);
    }
    
    // Create new agency (admin only)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Agency> createAgency(@Valid @RequestBody AgencyRequest agencyRequest) {
        System.out.println("[AgencyController] CREATE serviceIds = " + agencyRequest.getServiceIds());
        Agency agency = new Agency();
        agency.setName(agencyRequest.getName());
        agency.setAddress(agencyRequest.getAddress());
        agency.setPhoneNumber(agencyRequest.getPhoneNumber());
        agency.setCity(agencyRequest.getCity());
        agency.setEmail(agencyRequest.getEmail());
        agency.setDescription(agencyRequest.getDescription());
        agency.setBusinessHours(agencyRequest.getBusinessHours());
        
        Agency createdAgency = agencyService.createAgency(agency, agencyRequest.getServiceIds());
        return ResponseEntity.ok(createdAgency);
    }
    
    // Update agency (admin only)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Agency> updateAgency(@PathVariable Long id, @Valid @RequestBody AgencyRequest agencyRequest) {
        System.out.println("[AgencyController] UPDATE id=" + id + " serviceIds = " + agencyRequest.getServiceIds());
        Agency agency = new Agency();
        agency.setName(agencyRequest.getName());
        agency.setAddress(agencyRequest.getAddress());
        agency.setPhoneNumber(agencyRequest.getPhoneNumber());
        agency.setCity(agencyRequest.getCity());
        agency.setEmail(agencyRequest.getEmail());
        agency.setDescription(agencyRequest.getDescription());
        agency.setBusinessHours(agencyRequest.getBusinessHours());
        
        Agency updatedAgency = agencyService.updateAgency(id, agency, agencyRequest.getServiceIds());
        return ResponseEntity.ok(updatedAgency);
    }
    
    // Delete agency (admin only)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteAgency(@PathVariable Long id) {
        try {
            agencyService.deleteAgency(id);
            return ResponseEntity.ok(new ApiResponse("Agency deleted successfully", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    // Assign agent to agency (admin only)
    @PostMapping("/{agencyId}/assign-agent/{agentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> assignAgentToAgency(@PathVariable Long agencyId, @PathVariable Long agentId) {
        try {
            agencyService.assignAgentToAgency(agencyId, agentId);
            return ResponseEntity.ok(new ApiResponse("Agent assigned to agency successfully", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    // Remove agent from agency (admin only)
    @PostMapping("/remove-agent/{agentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> removeAgentFromAgency(@PathVariable Long agentId) {
        try {
            agencyService.removeAgentFromAgency(agentId);
            return ResponseEntity.ok(new ApiResponse("Agent removed from agency successfully", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    // Get all agents of an agency
    @GetMapping("/{agencyId}/agents")
    public ResponseEntity<List<Agent>> getAgencyAgents(@PathVariable Long agencyId) {
        List<Agent> agents = agencyService.getAgencyAgents(agencyId);
        return ResponseEntity.ok(agents);
    }
    
    // Public endpoints for user-facing application
    @GetMapping("/public")
    public ResponseEntity<List<Agency>> getPublicAgencyList() {
        List<Agency> agencies = agencyService.getAllAgencies();
        return ResponseEntity.ok(agencies);
    }

    @GetMapping("/public/by-city/{city}")
    public ResponseEntity<List<Agency>> getAgenciesByCity(@PathVariable String city) {
        List<Agency> agencies = agencyRepository.findByCity(city);
        return ResponseEntity.ok(agencies);
    }
}