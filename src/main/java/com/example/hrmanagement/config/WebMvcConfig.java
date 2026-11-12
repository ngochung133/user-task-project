package com.example.hrmanagement.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor 
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    private final FileUploadProperties uploadProperties;

    @Override 
    public void addResourceHandlers(ResourceHandlerRegistry registry){
        //noi de tim file
        String baseDir = uploadProperties.getBaseDir();
        // dùng để nói sẽ phục vụ các url nào
        registry.addResourceHandler("/uploads/**")
                //addResourceLocations noi cho Springboot biet tim file o daus
                .addResourceLocations("file:" + baseDir + "/");
    }
}
