package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.project.agent.model.ContactMessage;
import com.project.agent.model.Users;
import com.project.agent.repository.ContactMessageRepository;
import com.project.agent.repository.UserRepository;

@Service
public class ContactService {
    
    @Autowired
    private ContactMessageRepository contactMessageRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailService emailService;
    
    /**
     * Crée un nouveau message de contact
     */
    @Transactional
    public ContactMessage createContactMessage(String subject, String message) {
        // Obtenir l'utilisateur actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Créer et enregistrer le message
        ContactMessage contactMessage = new ContactMessage();
        contactMessage.setUser(user);
        contactMessage.setSubject(subject);
        contactMessage.setMessage(message);
        contactMessage.setCreatedAt(LocalDateTime.now());
        contactMessage.setRead(false);
        
        ContactMessage savedMessage = contactMessageRepository.save(contactMessage);
        
        // Envoyer une notification par email aux administrateurs
        emailService.sendContactMessageNotification(subject, message, user.getEmail(), user.getUsername());
        
        return savedMessage;
    }
    
    /**
     * Récupère les messages de l'utilisateur actuel
     */
    public List<ContactMessage> getCurrentUserMessages() {
        // Obtenir l'utilisateur actuel
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        return contactMessageRepository.findByUserOrderByCreatedAtDesc(user);
    }
    
    /**
     * Récupère les messages non lus (pour les admins)
     */
    public List<ContactMessage> getUnreadMessages() {
        return contactMessageRepository.findByReadOrderByCreatedAtDesc(false);
    }
    
    /**
     * Marque un message comme lu
     */
    @Transactional
    public ContactMessage markAsRead(Long messageId) {
        ContactMessage message = contactMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));
        
        message.setRead(true);
        return contactMessageRepository.save(message);
    }
    
    /**
     * Récupère tous les messages (pour les admins)
     */
    public List<ContactMessage> getAllMessages() {
        return contactMessageRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * Supprime un message
     */
    @Transactional
    public void deleteMessage(Long messageId) {
        ContactMessage message = contactMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));
        contactMessageRepository.delete(message);
    }

    /**
     * Compte les messages non lus d'un utilisateur
     */
    public long countUnreadMessages(Users user) {
        return contactMessageRepository.countByUserAndRead(user, false);
    }
}