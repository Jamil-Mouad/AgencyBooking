package com.project.agent.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.project.agent.model.Agency;
import com.project.agent.model.ServiceOffering;
import com.project.agent.repository.AgencyRepository;
import com.project.agent.repository.ServiceOfferingRepository;

@Service
public class ServiceOfferingService {

    @Autowired
    private ServiceOfferingRepository serviceOfferingRepository;
    
    @Autowired
    private AgencyRepository agencyRepository;
    
    // Récupérer tous les services
    public List<ServiceOffering> getAllServices() {
        return serviceOfferingRepository.findAll();
    }
    
    // Récupérer un service par ID
    public ServiceOffering getServiceById(Short id) {
        return serviceOfferingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service introuvable avec l'ID " + id));
    }
    
    // Créer un nouveau service
    public ServiceOffering createService(ServiceOffering service) {
        // Vérifier si un service avec ce nom existe déjà
        if (serviceOfferingRepository.existsByName(service.getName())) {
            throw new RuntimeException("Un service avec ce nom existe déjà");
        }
        
        return serviceOfferingRepository.save(service);
    }
    
    // Mettre à jour un service
    public ServiceOffering updateService(Short id, ServiceOffering serviceDetails) {
        ServiceOffering service = getServiceById(id);
        
        // Mettre à jour les champs
        service.setName(serviceDetails.getName());
        
        return serviceOfferingRepository.save(service);
    }
    
    // Supprimer un service
    public void deleteService(Short id) {
        ServiceOffering service = getServiceById(id);
        
        // Vérifier si des agences sont associées à ce service
        if (service.getAgencies() != null && !service.getAgencies().isEmpty()) {
            throw new RuntimeException("Impossible de supprimer un service associé à des agences. Retirez d'abord le service des agences.");
        }
        
        serviceOfferingRepository.delete(service);
    }
    
    // Assigner un service à une agence
    public void assignServiceToAgency(Short serviceId, Long agencyId) {
        ServiceOffering service = getServiceById(serviceId);
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence introuvable avec l'ID " + agencyId));
        
        if (!agency.getServices().contains(service)) {
            agency.getServices().add(service);
            agencyRepository.save(agency);
        }
    }
    
    // Retirer un service d'une agence
    public void removeServiceFromAgency(Short serviceId, Long agencyId) {
        ServiceOffering service = getServiceById(serviceId);
        Agency agency = agencyRepository.findById(agencyId)
                .orElseThrow(() -> new RuntimeException("Agence introuvable avec l'ID " + agencyId));
        
        if (agency.getServices().contains(service)) {
            agency.getServices().remove(service);
            agencyRepository.save(agency);
        }
    }
    
    // Récupérer toutes les agences proposant un service
    public List<Agency> getServiceAgencies(Short serviceId) {
        ServiceOffering service = getServiceById(serviceId);
        return service.getAgencies();
    }
}