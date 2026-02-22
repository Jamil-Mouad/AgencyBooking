package com.project.agent.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.AgentDTO;
import com.project.agent.dto.AgentRegistrationRequest;
import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.ChangeRoleRequest;
import com.project.agent.dto.RegisterRequest;
import com.project.agent.model.Agent;
import com.project.agent.model.Users;
import com.project.agent.repository.AgentRepository;
import com.project.agent.repository.UserRepository;
import com.project.agent.service.AgencyService;
import com.project.agent.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
	private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    @Autowired
    private UserService userService;
    
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private AgencyService agencyService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<Users> users = userRepository.findAll();
        List<Map<String, Object>> userList = users.stream()
            .map(user -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId()); 
                userMap.put("username", user.getDisplayName()); // Utilise le nom d'utilisateur
                userMap.put("email", user.getEmail());
                userMap.put("role", user.getRole());
                return userMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(userList);
    }
    
    @PostMapping("/users/change-role/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> changeUserRole(
            @PathVariable("id") Long userId,
            @Valid @RequestBody ChangeRoleRequest changeRoleRequest) {
        
        try {
            userService.changeUserRole(userId, changeRoleRequest.getNewRole());
            return ResponseEntity.ok(new ApiResponse("Rôle de l'utilisateur modifié avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Create a new agent
     */
    @PostMapping("/users/create-agent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> createAgent(@Valid @RequestBody AgentRegistrationRequest request) {
        try {
            RegisterRequest registerRequest = new RegisterRequest();
            registerRequest.setUsername(request.getUsername());
            registerRequest.setEmail(request.getEmail());
            registerRequest.setPassword(request.getPassword());
            registerRequest.setPasswordConfirm(request.getPasswordConfirm());
            
            Agent agent = userService.registerAgent(registerRequest, request.getAgencyId());
            return ResponseEntity.ok(new ApiResponse("Agent created successfully", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    /**
     * Convert existing user to agent
     */
    @PostMapping("/users/convert-to-agent/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> convertUserToAgent(
            @PathVariable("userId") Long userId,
            @RequestParam(required = false) Long agencyId) {
        try {
            Agent agent = userService.convertUserToAgent(userId, agencyId);
            return ResponseEntity.ok(new ApiResponse("User converted to agent successfully", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    /**
     * Get all agents
     */
    @GetMapping("/agents")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllAgents() {
        List<Agent> agents = agentRepository.findAll();
        List<Map<String, Object>> agentsList = agents.stream()
            .map(agent -> {
                Map<String, Object> agentMap = new HashMap<>();
                agentMap.put("id", agent.getId());
                agentMap.put("username", agent.getUsername());
                agentMap.put("email", agent.getEmail());
                agentMap.put("available", agent.isAvailable());
                
                // Ajouter explicitement les informations d'agence
                if (agent.getAgency() != null) {
                    agentMap.put("agencyId", agent.getAgency().getId());
                    agentMap.put("agencyName", agent.getAgency().getName());
                } else {
                    agentMap.put("agencyId", null);
                    agentMap.put("agencyName", null);
                }
                
                return agentMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(agentsList);
    }
    
    /**
     * Assign or remove agent from agency
     */
    @PutMapping("/agents/{id}/assign-agency")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> assignAgentToAgency(
            @PathVariable("id") Long agentId,
            @RequestBody Map<String, Long> body) {
        try {
            Long agencyId = body.get("agencyId");
            if (agencyId != null) {
                agencyService.assignAgentToAgency(agencyId, agentId);
            } else {
                agencyService.removeAgentFromAgency(agentId);
            }
            return ResponseEntity.ok(new ApiResponse("Agent reassigned successfully", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    /**
     * Toggle agent availability
     */
    @PutMapping("/agents/{id}/toggle-availability")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> toggleAgentAvailability(@PathVariable("id") Long agentId) {
        try {
            Agent agent = agentRepository.findById(agentId)
                    .orElseThrow(() -> new RuntimeException("Agent not found"));
            agent.setAvailable(!agent.isAvailable());
            agentRepository.save(agent);

            Map<String, Object> result = new HashMap<>();
            result.put("available", agent.isAvailable());
            result.put("message", "Availability toggled successfully");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Supprime un compte utilisateur
     */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteUser(@PathVariable("id") Long userId) {
        try {
            userService.deleteUserAccountById(userId);
            return ResponseEntity.ok(new ApiResponse("Compte utilisateur supprimé avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression du compte utilisateur: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    /**
     * Supprime un compte agent et son utilisateur associé
     */
    @DeleteMapping("/agents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteAgent(@PathVariable("id") Long agentId) {
        try {
            userService.deleteAgentAccount(agentId);
            return ResponseEntity.ok(new ApiResponse("Agent supprimé avec succès", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression de l'agent: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}