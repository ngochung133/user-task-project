package com.example.hrmanagement.feature.file;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.feature.file.dto.FileUploadResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;


@RequestMapping ("/api/v1/files")
@RestController 
@RequiredArgsConstructor 
public class FileController {
    private final FileService fileService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createFile(@RequestParam MultipartFile file,@RequestParam String folder) {
        FileUploadResponse response = this.fileService.upload(file, folder);

        return ApiResponse.created(response);
    }
    
}
