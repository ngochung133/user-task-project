package com.example.hrmanagement.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Component 
@ConfigurationProperties (prefix = "app.upload")
@Setter 
@Getter 
@AllArgsConstructor 
@NoArgsConstructor 
public class FileUploadProperties {
    private String baseDir;
    private Long maxFileSize;

    private List<String> allowedExtensions;
    private List<String> allowedFolders;
}
 