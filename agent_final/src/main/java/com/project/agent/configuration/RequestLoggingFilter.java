package com.project.agent.configuration;

import java.io.IOException;
import java.util.Collections;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Filtre pour journaliser toutes les requêtes HTTP
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {
    
    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Générer un ID de transaction unique pour cette requête
        String transactionId = java.util.UUID.randomUUID().toString();
        
        // Ajouter l'ID de transaction au MDC pour le logging
        MDC.put("transactionId", transactionId);
        
        // Wrapper pour pouvoir lire le corps de la requête multiple fois
        ContentCachingRequestWrapper requestWrapper = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);
        
        long startTime = System.currentTimeMillis();
        
        try {
            // Journaliser la requête entrante
            if (logger.isDebugEnabled()) {
                logRequest(requestWrapper);
            }
            
            // Exécuter la chaîne de filtres
            filterChain.doFilter(requestWrapper, responseWrapper);
            
            long duration = System.currentTimeMillis() - startTime;
            
            // Journaliser la réponse
            if (logger.isDebugEnabled()) {
                logResponse(responseWrapper, duration);
            }
        } finally {
            // Important: copier le contenu de la réponse dans la réponse originale
            responseWrapper.copyBodyToResponse();
            
            // Nettoyer le MDC
            MDC.remove("transactionId");
        }
    }
    
    private void logRequest(ContentCachingRequestWrapper request) {
        String queryString = request.getQueryString();
        String url = request.getRequestURL() + (queryString != null ? "?" + queryString : "");
        
        logger.debug("REQUEST [{}] {} {}", 
                request.getMethod(), 
                url, 
                getHeadersAsString(request));
    }
    
    private void logResponse(ContentCachingResponseWrapper response, long duration) {
        logger.debug("RESPONSE [{}] ({} ms)", 
                response.getStatus(), 
                duration);
    }
    
    private String getHeadersAsString(HttpServletRequest request) {
        StringBuilder headers = new StringBuilder();
        Collections.list(request.getHeaderNames()).forEach(headerName -> 
            headers.append(headerName).append("=").append(request.getHeader(headerName)).append(", ")
        );
        return headers.toString();
    }
}