package com.project.agent.configuration;

import java.util.HashMap;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CommonsRequestLoggingFilter;

import ch.qos.logback.classic.PatternLayout;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.ConsoleAppender;

@Configuration
public class LoggingConfiguration {
    
    /**
     * Configuration de la mise en page des logs console
     * Ceci est un exemple simplifié - dans un environnement de production, 
     * vous configureriez normalement cela via logback.xml ou logback-spring.xml
     */
    @Bean
    public ConsoleAppender<ILoggingEvent> consoleAppender() {
        ConsoleAppender<ILoggingEvent> appender = new ConsoleAppender<>();
        
        PatternLayout layout = new PatternLayout();
        layout.setPattern("%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] [%X{transactionId:-none}] %-5level %logger{36} - %msg%n");
        appender.setLayout(layout);
        
        return appender;
    }
    
    /**
     * Fonction utilitaire pour construire un message de log structuré
     */
    public static String buildStructuredLogMessage(String message, Map<String, Object> params) {
        if (params == null || params.isEmpty()) {
            return message;
        }
        
        StringBuilder sb = new StringBuilder(message);
        sb.append(" - ");
        
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            sb.append(entry.getKey()).append("=");
            if (entry.getValue() != null) {
                sb.append(entry.getValue().toString());
            } else {
                sb.append("null");
            }
            sb.append(", ");
        }
        
        // Supprimer la dernière virgule et espace
        if (sb.length() > 2) {
            sb.setLength(sb.length() - 2);
        }
        
        return sb.toString();
    }
    
    /**
     * Version raccourcie pour utilisation simplifiée
     */
    public static String log(String message, Object... keyValuePairs) {
        if (keyValuePairs.length % 2 != 0) {
            throw new IllegalArgumentException("Les paramètres doivent être des paires clé-valeur");
        }
        
        Map<String, Object> params = new HashMap<>();
        for (int i = 0; i < keyValuePairs.length; i += 2) {
            params.put(keyValuePairs[i].toString(), keyValuePairs[i+1]);
        }
        
        return buildStructuredLogMessage(message, params);
    }
}