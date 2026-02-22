package com.project.agent.service;

import java.time.LocalDateTime;
import java.util.Random;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.project.agent.model.Users;
import com.project.agent.model.VerificationCode;
import com.project.agent.repository.UserRepository;
import com.project.agent.repository.VerificationCodeRepository;

@Service
public class PasswordResetService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private VerificationCodeRepository verificationCodeRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    public void initiatePasswordReset(String email) {
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec cet email"));
        
        // Vérifier s'il existe déjà un code non utilisé et le supprimer
        verificationCodeRepository.findByUserAndUsed(user, false)
                .ifPresent(code -> verificationCodeRepository.delete(code));
        
        // Générer un nouveau code de vérification
        String code = generateVerificationCode();
        
        // Enregistrer le code dans la base de données
        VerificationCode verificationCode = new VerificationCode();
        verificationCode.setCode(code);
        verificationCode.setUser(user);
        verificationCode.setCreatedAt(LocalDateTime.now());
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(15)); // Expiration après 15 minutes
        verificationCode.setUsed(false);
        verificationCodeRepository.save(verificationCode);
        
        // Envoyer le code par email
        emailService.sendVerificationCode(user, code);
    }
    
    public boolean verifyCode(String email, String code) {
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec cet email"));
        
        VerificationCode verificationCode = verificationCodeRepository.findByCodeAndUser(code, user)
                .orElseThrow(() -> new RuntimeException("Code de vérification invalide"));
        
        if (verificationCode.isExpired()) {
            throw new RuntimeException("Code de vérification expiré");
        }
        
        if (verificationCode.isUsed()) {
            throw new RuntimeException("Code de vérification déjà utilisé");
        }
        
        return true;
    }
    
    public void resetPassword(String email, String code, String newPassword) {
        Users user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec cet email"));
        
        VerificationCode verificationCode = verificationCodeRepository.findByCodeAndUser(code, user)
                .orElseThrow(() -> new RuntimeException("Code de vérification invalide"));
        
        if (verificationCode.isExpired()) {
            throw new RuntimeException("Code de vérification expiré");
        }
        
        if (verificationCode.isUsed()) {
            throw new RuntimeException("Code de vérification déjà utilisé");
        }
        
        // Mettre à jour le mot de passe
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // Marquer le code comme utilisé
        verificationCode.setUsed(true);
        verificationCodeRepository.save(verificationCode);
    }
    
    private String generateVerificationCode() {
        // Générer un code à 6 chiffres
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }
}