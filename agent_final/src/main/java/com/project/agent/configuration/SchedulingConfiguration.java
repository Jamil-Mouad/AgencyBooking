package com.project.agent.configuration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "scheduler.enabled", matchIfMissing = true)
public class SchedulingConfiguration {
    // Cette classe est vide car son seul but est d'être annotée avec @EnableScheduling
    // et de permettre la configuration via des propriétés
}