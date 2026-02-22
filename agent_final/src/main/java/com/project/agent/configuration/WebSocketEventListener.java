package com.project.agent.configuration;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class WebSocketEventListener {
    
    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);
    
    // Map pour suivre les connexions actives
    private final Map<String, String> connectedAgents = new ConcurrentHashMap<>();
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        // Dans un système de production, vous récupéreriez l'identité de l'agent ici
        // Pour simplifier, nous utilisons seulement l'ID de session
        connectedAgents.put(sessionId, sessionId);
        
        logger.info("Nouvel agent connecté: {}", sessionId);
        
        // Informer tous les clients qu'un agent s'est connecté
        messagingTemplate.convertAndSend("/topic/agent-status", 
                Map.of("type", "CONNECTED", "agentId", sessionId, "totalConnected", connectedAgents.size()));
    }
    
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        if (connectedAgents.containsKey(sessionId)) {
            connectedAgents.remove(sessionId);
            
            logger.info("Agent déconnecté: {}", sessionId);
            
            // Informer tous les clients qu'un agent s'est déconnecté
            messagingTemplate.convertAndSend("/topic/agent-status", 
                    Map.of("type", "DISCONNECTED", "agentId", sessionId, "totalConnected", connectedAgents.size()));
        }
    }
    
    /**
     * Obtient le nombre d'agents actuellement connectés
     */
    public int getConnectedAgentsCount() {
        return connectedAgents.size();
    }
}