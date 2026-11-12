package com.example.hrmanagement.feature.file;

import org.springframework.web.multipart.MultipartFile;

import com.example.hrmanagement.feature.file.dto.FileUploadResponse;


public interface FileService {
    public FileUploadResponse upload(MultipartFile file, String folder);
    
}

    

