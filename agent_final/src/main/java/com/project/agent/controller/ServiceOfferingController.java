package com.project.agent.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.ServiceOfferingRequest;
import com.project.agent.model.Agency;
import com.project.agent.model.ServiceOffering;
import com.project.agent.service.ServiceOfferingService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/services")
public class ServiceOfferingController {

    @Autowired
    private ServiceOfferingService serviceOfferingService;
    
    // Récupérer tous les services (endpoint public)
    @GetMapping
    public ResponseEntity<List<ServiceOffering>> getAllServices() {
        List<ServiceOffering> services = serviceOfferingService.getAllServices();
        return ResponseEntity.ok(services);
    }
    
    // Récupérer un service par ID
    @GetMapping("/{id}")
    public ResponseEntity<ServiceOffering> getServiceById(@PathVariable Short id) {
        ServiceOffering service = serviceOfferingService.getServiceById(id);
        return ResponseEntity.ok(service);
    }
    
    // Créer un nouveau service (admin seulement)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServiceOffering> createService(@Valid @RequestBody ServiceOfferingRequest serviceRequest) {
        ServiceOffering service = new ServiceOffering();
        service.setName(serviceRequest.getName());
        
        ServiceOffering createdService = serviceOfferingService.createService(service);
        return ResponseEntity.ok(createdService);
    }
    
    // Mettre à jour un service (admin seulement)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ServiceOffering> updateService(@PathVariable Short id, @Valid @RequestBody ServiceOfferingRequest serviceRequest) {
        ServiceOffering service = new ServiceOffering();
        service.setName(serviceRequest.getName());
        
        ServiceOffering updatedService = serviceOfferingService.updateService(id, service);
        return ResponseEntity.ok(updatedService);
    }
    
    // Supprimer un service (admin seulement)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteService(@PathVariable Short id) {
        try {
            serviceOfferingService.deleteService(id);
            return ResponseEntity.ok(new ApiResponse("Service supprimé avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    // Assigner un service à une agence (admin seulement)
    @PostMapping("/{serviceId}/assign-agency/{agencyId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> assignServiceToAgency(@PathVariable Short serviceId, @PathVariable Long agencyId) {
        try {
            serviceOfferingService.assignServiceToAgency(serviceId, agencyId);
            return ResponseEntity.ok(new ApiResponse("Service assigné à l'agence avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    // Retirer un service d'une agence (admin seulement)
    @PostMapping("/{serviceId}/remove-agency/{agencyId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> removeServiceFromAgency(@PathVariable Short serviceId, @PathVariable Long agencyId) {
        try {
            serviceOfferingService.removeServiceFromAgency(serviceId, agencyId);
            return ResponseEntity.ok(new ApiResponse("Service retiré de l'agence avec succès", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    // Récupérer toutes les agences proposant un service
    @GetMapping("/{serviceId}/agencies")
    public ResponseEntity<List<Agency>> getServiceAgencies(@PathVariable Short serviceId) {
        List<Agency> agencies = serviceOfferingService.getServiceAgencies(serviceId);
        return ResponseEntity.ok(agencies);
    }
}