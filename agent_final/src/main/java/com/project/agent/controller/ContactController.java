package com.project.agent.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.ApiResponse;
import com.project.agent.dto.ContactMessageDTO;
import com.project.agent.service.ContactService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/user/contact")
public class ContactController {
    
    private static final Logger logger = LoggerFactory.getLogger(ContactController.class);
    
    @Autowired
    private ContactService contactService;
    
    /**
     * Soumission d'un nouveau message de contact
     */
    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ApiResponse> submitContactForm(@Valid @RequestBody ContactMessageDTO contactDTO) {
        try {
            logger.info("Soumission d'un nouveau message de contact: {}", contactDTO.getSubject());
            
            contactService.createContactMessage(contactDTO.getSubject(), contactDTO.getMessage());
            
            return ResponseEntity.ok(new ApiResponse("Votre message a été envoyé avec succès! Nous vous répondrons dans les meilleurs délais.", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la soumission du message de contact: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse("Erreur lors de l'envoi du message: " + e.getMessage(), false));
        }
    }
    
    /**
     * Récupère tous les messages de contact de l'utilisateur courant
     */
    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getUserMessages() {
        try {
            return ResponseEntity.ok(contactService.getCurrentUserMessages());
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des messages: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}