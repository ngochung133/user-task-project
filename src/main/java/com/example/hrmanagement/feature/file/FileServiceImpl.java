package com.example.hrmanagement.feature.file;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.hrmanagement.config.FileUploadProperties;
import com.example.hrmanagement.exception.FileUploadException;
import com.example.hrmanagement.feature.file.dto.FileUploadResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private static final Logger log = LoggerFactory.getLogger(FileServiceImpl.class);
    private final FileUploadProperties uploadProperties;

    @Override
    public FileUploadResponse upload(MultipartFile file, String folder) {
        String safeFolder = folder == null ? "" : folder.trim();
        String extension = validateAndGetExtension(file, safeFolder);

        // Sinh tên file duy nhất bằng UUID + đuôi file để tránh trùng và chống ghi đè
        String storeName = UUID.randomUUID() + "." + extension;

        // Xác định thư mục vd: ./uploads/logos và chuẩn hóa đường dẫn chống path traversal
        Path basePath = Path.of(uploadProperties.getBaseDir()).toAbsolutePath().normalize();
        Path targetDir = basePath.resolve(safeFolder).normalize();
        if (!targetDir.startsWith(basePath)) {
            throw new FileUploadException("Đường dẫn thư mục không hợp lệ");
        }

        // Đường dẫn của file và kiểm tra chắc chắn nằm trong thư mục cho phép
        Path targetPath = targetDir.resolve(storeName).normalize();
        if (!targetPath.startsWith(targetDir)) {
            throw new FileUploadException("Đường dẫn lưu file không hợp lệ");
        }

        try {
            // Tạo thư mục: chưa có thì tạo, có rồi thì bỏ qua
            Files.createDirectories(targetDir);
            // Up file lên đường dẫn (try-with-resources tự đóng stream, không dùng REPLACE_EXISTING để tránh ghi đè)
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetPath);
            }
        } catch (IOException ex) {
            log.error("Không thể lưu file vào thư mục {}", targetDir, ex);
            throw new RuntimeException("Không thể lưu file lên hệ thống", ex);
        }

        // Route HTTP khớp WebMvcConfig (/uploads/**) để client đọc ảnh
        String fileUrl = "/uploads/" + safeFolder + "/" + storeName;
        return new FileUploadResponse(
                storeName,
                safeFolder,
                fileUrl,
                file.getSize(),
                Instant.now());
    }

    private String validateAndGetExtension(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) {
            throw new FileUploadException("File không được để trống");
        }
        if (folder.isEmpty() || !uploadProperties.getAllowedFolders().contains(folder)) {
            // Ghép vào 1 chuỗi ngăn cách bởi dấu ,
            String allowed = String.join(", ", uploadProperties.getAllowedFolders());
            throw new FileUploadException("Thư mục không được phép, chỉ chấp nhận: " + allowed);
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new FileUploadException("Tên file không được để trống");
        }
        if (originalName.contains("..") || originalName.contains("/") || originalName.contains("\\")) {
            throw new FileUploadException("Tên file chứa ký tự đường dẫn không hợp lệ");
        }

        String extension = getExtension(originalName).toLowerCase(Locale.ROOT);
        if (!uploadProperties.getAllowedExtensions().contains(extension)) {
            // Ghép vào 1 chuỗi ngăn cách bởi dấu ,
            String allowed = String.join(", ", uploadProperties.getAllowedExtensions());
            throw new FileUploadException("Định dạng file không hợp lệ, chỉ chấp nhận: " + allowed);
        }

        if (file.getSize() > uploadProperties.getMaxFileSize()) {
            long maxSizeMb = uploadProperties.getMaxFileSize() / (1024 * 1024);
            throw new FileUploadException("Dung lượng file vượt quá giới hạn " + maxSizeMb + "MB");
        }

        if (!hasValidImageSignature(file, extension)) {
            throw new FileUploadException("Nội dung file không khớp định dạng ảnh ." + extension);
        }

        return extension;
    }

    // Kiểm tra chữ ký byte đầu (magic bytes) để xác minh đúng là ảnh thật, chặn file giả đuôi
    private boolean hasValidImageSignature(MultipartFile file, String extension) {
        byte[] header = new byte[12];
        int bytesRead;
        try (InputStream inputStream = file.getInputStream()) {
            bytesRead = inputStream.readNBytes(header, 0, header.length);
        } catch (IOException ex) {
            throw new FileUploadException("Không thể đọc nội dung file tải lên");
        }

        return switch (extension) {
            case "jpg", "jpeg" -> bytesRead >= 3
                    && (header[0] & 0xFF) == 0xFF
                    && (header[1] & 0xFF) == 0xD8
                    && (header[2] & 0xFF) == 0xFF;
            case "png" -> bytesRead >= 8
                    && (header[0] & 0xFF) == 0x89
                    && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                    && header[4] == 0x0D && header[5] == 0x0A
                    && header[6] == 0x1A && header[7] == 0x0A;
            case "gif" -> bytesRead >= 6
                    && header[0] == 'G' && header[1] == 'I' && header[2] == 'F'
                    && header[3] == '8' && (header[4] == '7' || header[4] == '9')
                    && header[5] == 'a';
            case "webp" -> bytesRead >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default -> false;
        };
    }

    // Hàm bổ trợ để lấy đuôi file như jpg, png...
    private String getExtension(String fileName) {
        int dotIndex = fileName.lastIndexOf('.');
        // Không có dấu . hoặc dấu . ở cuối
        if (dotIndex < 0 || dotIndex == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dotIndex + 1);
    }
}
