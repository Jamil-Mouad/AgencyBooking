//package com.project.agent.service;
//
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.mail.SimpleMailMessage;
//import org.springframework.mail.javamail.JavaMailSender;
//import org.springframework.stereotype.Service;
//import com.project.agent.model.Reservation;
//import com.project.agent.model.Users;
//
//@Service
//public class EmailService {
//	
//    @Autowired
//    private JavaMailSender mailSender;
//    
//    public void sendReservationConfirmation(Reservation reservation, String additionalMessage) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(reservation.getUser().getEmail());
//        message.setSubject("Confirmation de votre réservation");
//        
//        StringBuilder messageText = new StringBuilder();
//        messageText.append("Bonjour ").append(reservation.getUser().getUsername()).append(",\n\n");
//        messageText.append("Votre réservation pour ").append(reservation.getService()).append(" a été confirmée.\n");
//        messageText.append("Date de début: ").append(reservation.getStartDateTime()).append("\n");
//        messageText.append("Date de fin: ").append(reservation.getEndDateTime()).append("\n\n");
//        
//        if (additionalMessage != null && !additionalMessage.trim().isEmpty()) {
//            messageText.append("Message de l'agent: ").append(additionalMessage).append("\n\n");
//        }
//        
//        messageText.append("Merci de votre confiance.");
//        
//        message.setText(messageText.toString());
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//    
//    // Version de compatibilité
//    public void sendReservationConfirmation(Reservation reservation) {
//        sendReservationConfirmation(reservation, null);
//    }
//    
//    public void sendReservationCancellation(Reservation reservation, String reason) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(reservation.getUser().getEmail());
//        message.setSubject("Annulation de votre réservation");
//        
//        StringBuilder messageText = new StringBuilder();
//        messageText.append("Bonjour ").append(reservation.getUser().getUsername()).append(",\n\n");
//        messageText.append("Nous regrettons de vous informer que votre réservation pour ").append(reservation.getService()).append(" a été annulée.\n");
//        
//        if (reason != null && !reason.trim().isEmpty()) {
//            messageText.append("Raison de l'annulation: ").append(reason).append("\n\n");
//        }
//        
//        messageText.append("Si vous avez des questions, n'hésitez pas à nous contacter.\n\n");
//        messageText.append("Nous espérons vous servir à nouveau prochainement.");
//        
//        message.setText(messageText.toString());
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//    
//    public void sendReservationCompletion(Reservation reservation, String notes) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(reservation.getUser().getEmail());
//        message.setSubject("Votre rendez-vous a été complété");
//        
//        StringBuilder messageText = new StringBuilder();
//        messageText.append("Bonjour ").append(reservation.getUser().getUsername()).append(",\n\n");
//        messageText.append("Votre rendez-vous pour ").append(reservation.getService()).append(" a été complété avec succès.\n");
//        messageText.append("Date du rendez-vous: ").append(reservation.getStartDateTime()).append("\n\n");
//        
//        if (notes != null && !notes.trim().isEmpty()) {
//            messageText.append("Remarques: ").append(notes).append("\n\n");
//        }
//        
//        messageText.append("Nous vous remercions de votre confiance et espérons vous revoir bientôt.");
//        
//        message.setText(messageText.toString());
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//    
//    public void sendAppointmentReminder(Reservation reservation) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(reservation.getUser().getEmail());
//        message.setSubject("Rappel de votre rendez-vous à venir");
//        
//        StringBuilder messageText = new StringBuilder();
//        messageText.append("Bonjour ").append(reservation.getUser().getUsername()).append(",\n\n");
//        messageText.append("Nous vous rappelons votre rendez-vous à venir pour ").append(reservation.getService()).append(".\n");
//        messageText.append("Date et heure: ").append(reservation.getStartDateTime()).append("\n");
//        
//        if (reservation.getAgency() != null) {
//            messageText.append("Agence: ").append(reservation.getAgency().getName()).append("\n");
//            messageText.append("Adresse: ").append(reservation.getAgency().getAddress()).append(", ");
//            messageText.append(reservation.getAgency().getCity()).append("\n\n");
//        }
//        
//        messageText.append("Si vous ne pouvez pas assister à ce rendez-vous, veuillez nous contacter dès que possible.\n\n");
//        messageText.append("Merci et à bientôt !");
//        
//        message.setText(messageText.toString());
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//    
//    public void sendVerificationCode(Users user, String code) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(user.getEmail());
//        message.setSubject("Code de vérification pour réinitialiser votre mot de passe");
//        message.setText("Bonjour " + user.getUsername() + ",\n\n" +
//                "Voici votre code de vérification pour réinitialiser votre mot de passe: " + code + "\n" +
//                "Ce code expirera dans 15 minutes.\n\n" +
//                "Si vous n'avez pas demandé à réinitialiser votre mot de passe, veuillez ignorer cet email.");
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//    
//    public void sendRegistrationVerificationCode(String email, String username, String code) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(email);
//        message.setSubject("Vérification de votre adresse email");
//        message.setText("Bonjour " + username + ",\n\n" +
//                "Merci de vous être inscrit. Pour valider votre compte, veuillez utiliser le code suivant: " + code + "\n" +
//                "Ce code expirera dans 15 minutes.\n\n" +
//                "Si vous n'avez pas demandé à créer un compte, veuillez ignorer cet email.");
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//    
//    /**
//     * Envoie une notification aux administrateurs concernant un nouveau message de contact
//     */
//    public void sendContactMessageNotification(String subject, String message, String userEmail, String username) {
//        SimpleMailMessage mailMessage = new SimpleMailMessage();
//        // Dans un environnement de production, remplacez par l'adresse email réelle des administrateurs
//        mailMessage.setTo("javajamil89@gmail.com"); 
//        mailMessage.setSubject("Nouveau message de contact: " + subject);
//        
//        StringBuilder messageText = new StringBuilder();
//        messageText.append("Un nouveau message de contact a été reçu de la part de: ").append(username)
//                 .append(" (").append(userEmail).append(")\n\n");
//        messageText.append("Sujet: ").append(subject).append("\n\n");
//        messageText.append("Message:\n").append(message);
//        
//        mailMessage.setText(messageText.toString());
//        mailMessage.setFrom("javajamil89@gmail.com");
//        
//        mailSender.send(mailMessage);
//    }
//    
//    /**
//     * Envoie un email de remerciement après soumission d'un avis sur une réservation
//     */
//    public void sendFeedbackThankYou(Users user, String serviceName) {
//        SimpleMailMessage message = new SimpleMailMessage();
//        message.setTo(user.getEmail());
//        message.setSubject("Merci pour votre avis");
//        
//        StringBuilder messageText = new StringBuilder();
//        messageText.append("Bonjour ").append(user.getUsername()).append(",\n\n");
//        messageText.append("Nous vous remercions d'avoir partagé votre avis concernant votre expérience pour ")
//                 .append(serviceName).append(".\n\n");
//        messageText.append("Vos commentaires sont précieux et nous aident à améliorer constamment nos services.\n\n");
//        messageText.append("Nous espérons vous revoir bientôt !");
//        
//        message.setText(messageText.toString());
//        message.setFrom("javajamil89@gmail.com");
//        mailSender.send(message);
//    }
//}
package com.project.agent.service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import com.project.agent.model.Reservation;
import com.project.agent.model.Users;

@Service
public class EmailService {
    
    @Autowired
    private JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:4200}")
    private String frontendUrl;

    private static final String EMAIL_TEMPLATE_PATH = "classpath:templates/email_template.html";
    private static final String FROM_EMAIL = "javajamil89@gmail.com";
    
    /**
     * Charge le template HTML et remplace les variables par leurs valeurs
     */
    private String loadAndProcessTemplate(String title, String username, String messageContent, 
                                         String actionButton, String conclusion) {
        try {
            // Charger le template HTML
            String template = new String(Files.readAllBytes(
                    ResourceUtils.getFile(EMAIL_TEMPLATE_PATH).toPath()), StandardCharsets.UTF_8);
            
            // Remplacer les variables par leurs valeurs
            template = template.replace("{{TITLE}}", title)
                              .replace("{{USERNAME}}", username)
                              .replace("{{MESSAGE_CONTENT}}", messageContent)
                              .replace("{{ACTION_BUTTON}}", actionButton != null ? actionButton : "")
                              .replace("{{CONCLUSION}}", conclusion);
            
            return template;
        } catch (IOException e) {
            // En cas d'erreur, retourner un message simple
            return "<html><body><p>Bonjour " + username + ",</p><p>" + messageContent + "</p></body></html>";
        }
    }
    
    /**
     * Crée un bouton d'action HTML
     */
    private String createActionButton(String text, String url) {
        if (text == null || url == null) {
            return "";
        }
        
        return "<a href=\"" + url + "\" style=\"display: inline-block; background-color: #4263eb; " +
               "color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; " +
               "border-radius: 6px; font-size: 16px;\">" + text + "</a>";
    }
    
    /**
     * Envoie un email HTML avec fallback texte
     */
    private void sendHtmlEmail(String to, String subject, String htmlContent, String textContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(textContent, htmlContent); // Le second paramètre à true indique que c'est du HTML
            helper.setFrom(FROM_EMAIL);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            // Gérer l'exception
            e.printStackTrace();
        }
    }
    
    public void sendReservationConfirmation(Reservation reservation, String additionalMessage) {
        String title = "Confirmation de votre réservation";
        String username = reservation.getUser().getUsername();
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Votre réservation pour <strong style=\"color: #4263eb;\">")
                  .append(reservation.getService())
                  .append("</strong> a été confirmée.</p>");
        
        htmlContent.append("<table style=\"width: 100%; border-collapse: collapse; margin-bottom: 15px;\">");
        htmlContent.append("<tr><td style=\"padding: 8px 0; color: #718096;\">Date de début:</td>")
                  .append("<td style=\"padding: 8px 0;\">").append(reservation.getStartDateTime()).append("</td></tr>");
        htmlContent.append("<tr><td style=\"padding: 8px 0; color: #718096;\">Date de fin:</td>")
                  .append("<td style=\"padding: 8px 0;\">").append(reservation.getEndDateTime()).append("</td></tr>");
        htmlContent.append("</table>");
        
        if (additionalMessage != null && !additionalMessage.trim().isEmpty()) {
            htmlContent.append("<p style=\"margin-bottom: 15px; padding: 10px; background-color: #ebf4ff; border-radius: 4px;\">")
                      .append("<strong>Message de l'agent:</strong> ").append(additionalMessage).append("</p>");
        }
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Votre réservation pour ").append(reservation.getService()).append(" a été confirmée.\n");
        textContent.append("Date de début: ").append(reservation.getStartDateTime()).append("\n");
        textContent.append("Date de fin: ").append(reservation.getEndDateTime()).append("\n\n");
        
        if (additionalMessage != null && !additionalMessage.trim().isEmpty()) {
            textContent.append("Message de l'agent: ").append(additionalMessage).append("\n\n");
        }
        
        textContent.append("Merci de votre confiance.");
        
        // Créer un bouton d'action
        String actionButton = createActionButton("Voir ma réservation", frontendUrl + "/user/reservations");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            actionButton, 
            "Merci de votre confiance."
        );
        
        // Envoyer l'email
        sendHtmlEmail(reservation.getUser().getEmail(), title, emailHtml, textContent.toString());
    }
    
    // Version de compatibilité
    public void sendReservationConfirmation(Reservation reservation) {
        sendReservationConfirmation(reservation, null);
    }
    
    public void sendReservationCancellation(Reservation reservation, String reason) {
        String title = "Annulation de votre réservation";
        String username = reservation.getUser().getUsername();
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Nous regrettons de vous informer que votre réservation pour <strong style=\"color: #4263eb;\">")
                  .append(reservation.getService())
                  .append("</strong> a été annulée.</p>");
        
        if (reason != null && !reason.trim().isEmpty()) {
            htmlContent.append("<p style=\"margin-bottom: 15px; padding: 10px; background-color: #fff5f5; border-radius: 4px; border-left: 4px solid #fc8181;\">")
                      .append("<strong>Raison de l'annulation:</strong> ").append(reason).append("</p>");
        }
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Nous regrettons de vous informer que votre réservation pour ")
                  .append(reservation.getService()).append(" a été annulée.\n");
        
        if (reason != null && !reason.trim().isEmpty()) {
            textContent.append("Raison de l'annulation: ").append(reason).append("\n\n");
        }
        
        textContent.append("Si vous avez des questions, n'hésitez pas à nous contacter.\n\n");
        textContent.append("Nous espérons vous servir à nouveau prochainement.");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            null, 
            "Si vous avez des questions, n'hésitez pas à nous contacter.<br>Nous espérons vous servir à nouveau prochainement."
        );
        
        // Envoyer l'email
        sendHtmlEmail(reservation.getUser().getEmail(), title, emailHtml, textContent.toString());
    }
    
    public void sendReservationCompletion(Reservation reservation, String notes) {
        String title = "Votre rendez-vous a été complété";
        String username = reservation.getUser().getUsername();
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Votre rendez-vous pour <strong style=\"color: #4263eb;\">")
                  .append(reservation.getService())
                  .append("</strong> a été complété avec succès.</p>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Date du rendez-vous: <span style=\"color: #4a5568;\">")
                  .append(reservation.getStartDateTime()).append("</span></p>");
        
        if (notes != null && !notes.trim().isEmpty()) {
            htmlContent.append("<div style=\"margin-bottom: 15px; padding: 15px; background-color: #f0fff4; border-radius: 4px; border-left: 4px solid #68d391;\">")
                      .append("<strong>Remarques:</strong><br>").append(notes.replace("\n", "<br>")).append("</div>");
        }
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Votre rendez-vous pour ").append(reservation.getService())
                  .append(" a été complété avec succès.\n");
        textContent.append("Date du rendez-vous: ").append(reservation.getStartDateTime()).append("\n\n");
        
        if (notes != null && !notes.trim().isEmpty()) {
            textContent.append("Remarques: ").append(notes).append("\n\n");
        }
        
        textContent.append("Nous vous remercions de votre confiance et espérons vous revoir bientôt.");
        
        // Créer un bouton d'action
        String actionButton = createActionButton("Donner votre avis", frontendUrl + "/user/reservations");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            actionButton, 
            "Nous vous remercions de votre confiance et espérons vous revoir bientôt."
        );
        
        // Envoyer l'email
        sendHtmlEmail(reservation.getUser().getEmail(), title, emailHtml, textContent.toString());
    }
    
    public void sendAppointmentReminder(Reservation reservation) {
        String title = "Rappel de votre rendez-vous à venir";
        String username = reservation.getUser().getUsername();
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Nous vous rappelons votre rendez-vous à venir pour <strong style=\"color: #4263eb;\">")
                  .append(reservation.getService())
                  .append("</strong>.</p>");
        
        htmlContent.append("<table style=\"width: 100%; border-collapse: collapse; margin-bottom: 20px;\">");
        htmlContent.append("<tr><td style=\"padding: 8px 0; color: #718096;\">Date et heure:</td>")
                  .append("<td style=\"padding: 8px 0;\">").append(reservation.getStartDateTime()).append("</td></tr>");
        
        if (reservation.getAgency() != null) {
            htmlContent.append("<tr><td style=\"padding: 8px 0; color: #718096;\">Agence:</td>")
                      .append("<td style=\"padding: 8px 0;\">").append(reservation.getAgency().getName()).append("</td></tr>");
            htmlContent.append("<tr><td style=\"padding: 8px 0; color: #718096;\">Adresse:</td>")
                      .append("<td style=\"padding: 8px 0;\">").append(reservation.getAgency().getAddress())
                      .append(", ").append(reservation.getAgency().getCity()).append("</td></tr>");
        }
        
        htmlContent.append("</table>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px; padding: 10px; background-color: #fffaf0; border-radius: 4px; border-left: 4px solid #ed8936;\">")
                  .append("Si vous ne pouvez pas assister à ce rendez-vous, veuillez nous contacter dès que possible.")
                  .append("</p>");
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Nous vous rappelons votre rendez-vous à venir pour ")
                  .append(reservation.getService()).append(".\n");
        textContent.append("Date et heure: ").append(reservation.getStartDateTime()).append("\n");
        
        if (reservation.getAgency() != null) {
            textContent.append("Agence: ").append(reservation.getAgency().getName()).append("\n");
            textContent.append("Adresse: ").append(reservation.getAgency().getAddress()).append(", ")
                      .append(reservation.getAgency().getCity()).append("\n\n");
        }
        
        textContent.append("Si vous ne pouvez pas assister à ce rendez-vous, veuillez nous contacter dès que possible.\n\n");
        textContent.append("Merci et à bientôt !");
        
        // Créer un bouton d'action
        String actionButton = createActionButton("Voir les détails", frontendUrl + "/user/reservations");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            actionButton, 
            "Merci et à bientôt !"
        );
        
        // Envoyer l'email
        sendHtmlEmail(reservation.getUser().getEmail(), title, emailHtml, textContent.toString());
    }
    
    public void sendVerificationCode(Users user, String code) {
        String title = "Code de vérification pour réinitialiser votre mot de passe";
        String username = user.getUsername();
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Voici votre code de vérification pour réinitialiser votre mot de passe:</p>");
        
        htmlContent.append("<div style=\"margin: 20px 0; padding: 15px; background-color: #edf2ff; border-radius: 4px; text-align: center;\">")
                  .append("<span style=\"font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #4263eb;\">")
                  .append(code).append("</span></div>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Ce code expirera dans 15 minutes.</p>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px; font-style: italic; color: #718096;\">")
                  .append("Si vous n'avez pas demandé à réinitialiser votre mot de passe, veuillez ignorer cet email.")
                  .append("</p>");
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Voici votre code de vérification pour réinitialiser votre mot de passe: ").append(code).append("\n");
        textContent.append("Ce code expirera dans 15 minutes.\n\n");
        textContent.append("Si vous n'avez pas demandé à réinitialiser votre mot de passe, veuillez ignorer cet email.");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            null, 
            ""
        );
        
        // Envoyer l'email
        sendHtmlEmail(user.getEmail(), title, emailHtml, textContent.toString());
    }
    
    public void sendRegistrationVerificationCode(String email, String username, String code) {
        String title = "Vérification de votre adresse email";
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Merci de vous être inscrit. Pour valider votre compte, veuillez utiliser le code suivant:</p>");
        
        htmlContent.append("<div style=\"margin: 20px 0; padding: 15px; background-color: #edf2ff; border-radius: 4px; text-align: center;\">")
                  .append("<span style=\"font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #4263eb;\">")
                  .append(code).append("</span></div>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Ce code expirera dans 15 minutes.</p>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px; font-style: italic; color: #718096;\">")
                  .append("Si vous n'avez pas demandé à créer un compte, veuillez ignorer cet email.")
                  .append("</p>");
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Merci de vous être inscrit. Pour valider votre compte, veuillez utiliser le code suivant: ")
                  .append(code).append("\n");
        textContent.append("Ce code expirera dans 15 minutes.\n\n");
        textContent.append("Si vous n'avez pas demandé à créer un compte, veuillez ignorer cet email.");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            null, 
            ""
        );
        
        // Envoyer l'email
        sendHtmlEmail(email, title, emailHtml, textContent.toString());
    }
    
    /**
     * Envoie une notification aux administrateurs concernant un nouveau message de contact
     */
    public void sendContactMessageNotification(String subject, String message, String userEmail, String username) {
        String title = "Nouveau message de contact: " + subject;
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Un nouveau message de contact a été reçu de la part de: <strong>")
                  .append(username).append("</strong> (<a href=\"mailto:").append(userEmail).append("\" style=\"color: #4263eb;\">")
                  .append(userEmail).append("</a>)</p>");
        
        htmlContent.append("<div style=\"margin-bottom: 15px;\">");
        htmlContent.append("<p style=\"margin-bottom: 5px; font-weight: 600;\">Sujet:</p>");
        htmlContent.append("<p style=\"margin-top: 0; padding: 10px; background-color: #f7fafc; border-radius: 4px;\">")
                  .append(subject).append("</p>");
        htmlContent.append("</div>");
        
        htmlContent.append("<div style=\"margin-bottom: 15px;\">");
        htmlContent.append("<p style=\"margin-bottom: 5px; font-weight: 600;\">Message:</p>");
        htmlContent.append("<div style=\"padding: 15px; background-color: #f7fafc; border-radius: 4px; white-space: pre-wrap;\">")
                  .append(message.replace("\n", "<br>")).append("</div>");
        htmlContent.append("</div>");
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Un nouveau message de contact a été reçu de la part de: ").append(username)
                 .append(" (").append(userEmail).append(")\n\n");
        textContent.append("Sujet: ").append(subject).append("\n\n");
        textContent.append("Message:\n").append(message);
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            "Administrateur", 
            htmlContent.toString(), 
            null, 
            "Vous pouvez répondre directement à cet email pour contacter l'utilisateur."
        );
        
        // Envoyer l'email
        sendHtmlEmail("javajamil89@gmail.com", title, emailHtml, textContent.toString());
    }
    
    /**
     * Envoie un email de remerciement après soumission d'un avis sur une réservation
     */
    public void sendFeedbackThankYou(Users user, String serviceName) {
        String title = "Merci pour votre avis";
        String username = user.getUsername();
        
        // Construire le contenu du message HTML
        StringBuilder htmlContent = new StringBuilder();
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Nous vous remercions d'avoir partagé votre avis concernant votre expérience pour <strong style=\"color: #4263eb;\">")
                  .append(serviceName).append("</strong>.</p>");
        
        htmlContent.append("<p style=\"margin-bottom: 15px;\">Vos commentaires sont précieux et nous aident à améliorer constamment nos services.</p>");
        
        // Construire le contenu texte (fallback)
        StringBuilder textContent = new StringBuilder();
        textContent.append("Bonjour ").append(username).append(",\n\n");
        textContent.append("Nous vous remercions d'avoir partagé votre avis concernant votre expérience pour ")
                 .append(serviceName).append(".\n\n");
        textContent.append("Vos commentaires sont précieux et nous aident à améliorer constamment nos services.\n\n");
        textContent.append("Nous espérons vous revoir bientôt !");
        
        // Créer un bouton d'action
        String actionButton = createActionButton("Voir nos services", frontendUrl + "/user/agencies");
        
        // Charger et traiter le template
        String emailHtml = loadAndProcessTemplate(
            title, 
            username, 
            htmlContent.toString(), 
            actionButton, 
            "Nous espérons vous revoir bientôt !"
        );
        
        // Envoyer l'email
        sendHtmlEmail(user.getEmail(), title, emailHtml, textContent.toString());
    }
}
