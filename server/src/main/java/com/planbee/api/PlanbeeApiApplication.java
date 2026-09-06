package com.planbee.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@ConfigurationPropertiesScan
@SpringBootApplication
public class PlanbeeApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(PlanbeeApiApplication.class, args);
	}

}
