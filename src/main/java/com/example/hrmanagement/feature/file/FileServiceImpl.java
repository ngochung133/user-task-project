package com.example.hrmanagement.feature.file;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.hrmanagement.config.FileUploadProperties;
import com.example.hrmanagement.feature.file.dto.FileUploadResponse;
import com.example.hrmanagement.exception.FileUploadException;
import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
public class FileServiceImpl implements FileService {
    private final FileUploadProperties uploadProperties;

    @Override 
    public FileUploadResponse upload(MultipartFile file, String folder){
        validate(file,folder);
        String originalName = file.getOriginalFilename();
        // chuan hoa file name
        String sanitizeName = sanitizeFileName(originalName);
        //file name duoc chuan hoa them thoi gian thuc 
        String storeName = System.currentTimeMillis() + "_" + sanitizeName;

        //Xác định thư mục vd: ./upload/logos
        Path targetDir = Path.of(uploadProperties.getBaseDir(),folder);
        try {
            //tao thu muc: chua co thi tao, co roi thi bo qua
            Files.createDirectories(targetDir);
        } catch (IOException ex) {
            throw new FileUploadException(("Can not create Directory" + ex.getMessage()));
        }
        try {
            //đường dẫn của file
            Path targetPath = targetDir.resolve(storeName);
            //Up file lên đường dẫn 
            //REPLACE_EXISTING ghi đè nếu đã có nội dung
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            throw new FileUploadException("Can not save file" + e.getMessage());
        }
        String fileUrl = uploadProperties.getBaseDir() + "/" +  folder + "/" + storeName;
        return new FileUploadResponse(
            storeName,
            folder,
            fileUrl,
            file.getSize(),
            Instant.now()
        );
    }

    private String sanitizeFileName(String fileName){
        //thay cac ki tu dac biet thanh _
        return fileName.replaceAll("[^A-Za-z0-9._\\-]", "_");
    }  


    private void validate(MultipartFile file, String folder){
        if(file == null || file.isEmpty()){
            throw new FileUploadException("File not provided");
        }
        String originalName = file.getOriginalFilename();
        if(originalName == null || originalName.isBlank()){
            throw new FileUploadException("File name can not be null or blank");
        }
        String lastName = getExtension(file.getOriginalFilename()).toLowerCase();
        if(!uploadProperties.getAllowedExtensions().contains(lastName)){
            // //ghep vao 1 chuoi ngan cach boi dau ,
            String allowed = String.join(", ", uploadProperties.getAllowedExtensions());
            throw new FileUploadException("invalid file format, only accept : "+ allowed);
        }
        if(file.getSize() > uploadProperties.getMaxFileSize()){
            Long maxSize = uploadProperties.getMaxFileSize() / (1024 * 1024);
            throw new FileUploadException("Maximum File Size is " + maxSize);
        }
        if(!uploadProperties.getAllowedFolders().contains(folder)){
            String allowed = String.join(", ", uploadProperties.getAllowedFolders());
            throw new FileUploadException("Folder is not accepted, please upload on : " + allowed);
        }
    }

    //Hàm bỏ trợ để lấy đuôi file như jpg, png...
    private String getExtension(String fieldName){
        int dotIndex = fieldName.lastIndexOf('.');
        // khong co dau . hoac dau . o cuoi
        if(dotIndex < 0 || dotIndex == fieldName.length() - 1){
            return "";
        }
        return fieldName.substring(dotIndex + 1);
    }
}
