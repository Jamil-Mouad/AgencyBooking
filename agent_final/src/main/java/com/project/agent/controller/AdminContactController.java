package com.project.agent.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.agent.dto.ApiResponse;
import com.project.agent.service.ContactService;

@RestController
@RequestMapping("/api/admin/contact")
@PreAuthorize("hasRole('ADMIN')")
public class AdminContactController {
    
    private static final Logger logger = LoggerFactory.getLogger(AdminContactController.class);
    
    @Autowired
    private ContactService contactService;
    
    /**
     * Récupère tous les messages
     */
    @GetMapping
    public ResponseEntity<?> getAllMessages() {
        try {
            logger.info("Récupération de tous les messages");
            return ResponseEntity.ok(contactService.getAllMessages());
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des messages: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    /**
     * Récupère tous les messages non lus
     */
    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadMessages() {
        try {
            logger.info("Récupération des messages non lus");
            return ResponseEntity.ok(contactService.getUnreadMessages());
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des messages non lus: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
    
    /**
     * Marque un message comme lu
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse> markAsRead(@PathVariable Long id) {
        try {
            logger.info("Marquage du message {} comme lu", id);
            contactService.markAsRead(id);
            return ResponseEntity.ok(new ApiResponse("Message marqué comme lu", true));
        } catch (Exception e) {
            logger.error("Erreur lors du marquage du message comme lu: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }

    /**
     * Supprime un message
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse> deleteMessage(@PathVariable Long id) {
        try {
            logger.info("Suppression du message {}", id);
            contactService.deleteMessage(id);
            return ResponseEntity.ok(new ApiResponse("Message supprimé", true));
        } catch (Exception e) {
            logger.error("Erreur lors de la suppression du message: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new ApiResponse(e.getMessage(), false));
        }
    }
}