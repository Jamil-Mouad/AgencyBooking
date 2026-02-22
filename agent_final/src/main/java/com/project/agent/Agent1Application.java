package com.project.agent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Agent1Application {

	public static void main(String[] args) {
		SpringApplication.run(Agent1Application.class, args);
	}

}
