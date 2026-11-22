package com.example.hrmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.example.hrmanagement.config.FileUploadProperties;
import com.example.hrmanagement.exception.FileUploadException;
import com.example.hrmanagement.feature.file.FileServiceImpl;
import com.example.hrmanagement.feature.file.dto.FileUploadResponse;

class FileServiceTest {

    private static final byte[] VALID_PNG = new byte[] {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D
    };

    @TempDir
    Path tempDir;

    private FileServiceImpl fileService;

    @BeforeEach
    void setUp() {
        FileUploadProperties properties = new FileUploadProperties(
                tempDir.toString(),
                1024L * 1024L,
                List.of("jpg", "jpeg", "png", "gif", "webp"),
                List.of("avatars", "logos"));
        fileService = new FileServiceImpl(properties);
    }

    @Test
    @DisplayName("Upload PNG hợp lệ tạo 2 file UUID riêng khi trùng tên gốc và trả URL /uploads/...")
    void uploadValidPngCreatesUniqueUuidFiles() {
        MockMultipartFile first = new MockMultipartFile("file", "logo.png", "image/png", VALID_PNG);
        MockMultipartFile second = new MockMultipartFile("file", "logo.png", "image/png", VALID_PNG);

        FileUploadResponse res1 = fileService.upload(first, "logos");
        FileUploadResponse res2 = fileService.upload(second, "logos");

        assertThat(res1.fileName()).endsWith(".png").isNotEqualTo(res2.fileName());
        assertThat(res1.fileUrl()).isEqualTo("/uploads/logos/" + res1.fileName());
        assertThat(Files.exists(tempDir.resolve("logos").resolve(res1.fileName()))).isTrue();
        assertThat(Files.exists(tempDir.resolve("logos").resolve(res2.fileName()))).isTrue();
    }

    @Test
    @DisplayName("Từ chối file giả ảnh (đuôi .png nhưng nội dung text)")
    void uploadFakePngThrowsException() {
        MockMultipartFile fake = new MockMultipartFile("file", "fake.png", "image/png", "not-an-image".getBytes());

        assertThatThrownBy(() -> fileService.upload(fake, "logos"))
                .isInstanceOf(FileUploadException.class)
                .hasMessageContaining("không khớp định dạng ảnh");
    }

    @Test
    @DisplayName("Từ chối tên file chứa path traversal hoặc folder ngoài allowlist")
    void uploadPathTraversalThrowsException() {
        MockMultipartFile traversal = new MockMultipartFile("file", "../evil.png", "image/png", VALID_PNG);
        MockMultipartFile validFile = new MockMultipartFile("file", "ok.png", "image/png", VALID_PNG);

        assertThatThrownBy(() -> fileService.upload(traversal, "logos"))
                .isInstanceOf(FileUploadException.class);
        assertThatThrownBy(() -> fileService.upload(validFile, "../etc"))
                .isInstanceOf(FileUploadException.class);
    }
}
