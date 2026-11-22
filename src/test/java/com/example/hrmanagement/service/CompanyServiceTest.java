package com.example.hrmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.company.CompanyServiceImpl;
import com.example.hrmanagement.feature.company.dto.CompanyFilterDTO;
import com.example.hrmanagement.feature.company.dto.CompanyRequestDTO;
import com.example.hrmanagement.feature.company.dto.CompanyResponseDTO;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @InjectMocks
    private CompanyServiceImpl companyService;

    private Company company;
    private CompanyRequestDTO validRequest;

    @BeforeEach
    void setUp() {
        company = new Company();
        company.setId(1L);
        company.setName("Acme Corp");
        company.setDescription("Tech company");
        company.setAddress("Ha Noi");
        company.setLogo("acme.png");

        validRequest = new CompanyRequestDTO("Acme Corp", "Tech company", "Ha Noi", "acme.png");
    }

    @Nested
    @DisplayName("Tạo Company")
    class CreateCompany {

        @Test
        @DisplayName("Tạo Company thành công")
        void create_shouldSaveAndReturnResponse() {
            when(companyRepository.existsByName("Acme Corp")).thenReturn(false);
            when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(inv -> {
                Company c = inv.getArgument(0);
                c.setId(1L);
                return c;
            });

            CompanyResponseDTO response = companyService.create(validRequest);

            assertThat(response.id()).isEqualTo(1L);
            assertThat(response.name()).isEqualTo("Acme Corp");
            assertThat(response.logo()).isEqualTo("acme.png");
            verify(companyRepository).saveAndFlush(any(Company.class));
        }

        @Test
        @DisplayName("Trùng tên Company ném 409 và không lưu DB")
        void create_whenNameExists_shouldThrowConflict() {
            when(companyRepository.existsByName("Acme Corp")).thenReturn(true);

            assertThatThrownBy(() -> companyService.create(validRequest))
                    .isInstanceOf(ResourceAlreadyExistException.class)
                    .hasMessageContaining("Acme Corp");

            verify(companyRepository, never()).saveAndFlush(any(Company.class));
        }
    }

    @Nested
    @DisplayName("Cập nhật Company")
    class UpdateCompany {

        @Test
        @DisplayName("Cập nhật thành công kể cả khi giữ nguyên tên")
        void update_shouldSucceed() {
            CompanyRequestDTO updateReq = new CompanyRequestDTO("Acme Corp", "Updated desc", "Da Nang", "new.png");
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(companyRepository.existsByNameAndIdNot("Acme Corp", 1L)).thenReturn(false);
            when(companyRepository.saveAndFlush(any(Company.class))).thenAnswer(inv -> inv.getArgument(0));

            CompanyResponseDTO response = companyService.update(1L, updateReq);

            assertThat(response.description()).isEqualTo("Updated desc");
            assertThat(response.address()).isEqualTo("Da Nang");
            assertThat(response.logo()).isEqualTo("new.png");
        }

        @Test
        @DisplayName("Không tìm thấy Company khi cập nhật ném 404")
        void update_whenNotFound_shouldThrowNotFound() {
            when(companyRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> companyService.update(99L, validRequest))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(companyRepository, never()).saveAndFlush(any(Company.class));
        }

        @Test
        @DisplayName("Trùng tên Company khác khi cập nhật ném 409")
        void update_whenDuplicateName_shouldThrowConflict() {
            CompanyRequestDTO updateReq = new CompanyRequestDTO("Other Corp", "Desc", "HCM", "o.png");
            when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
            when(companyRepository.existsByNameAndIdNot("Other Corp", 1L)).thenReturn(true);

            assertThatThrownBy(() -> companyService.update(1L, updateReq))
                    .isInstanceOf(ResourceAlreadyExistException.class);

            verify(companyRepository, never()).saveAndFlush(any(Company.class));
        }
    }

    @Test
    @DisplayName("Lấy Company theo ID thành công và báo 404 khi không tồn tại")
    void getById_shouldReturnOrThrowNotFound() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(companyRepository.findById(2L)).thenReturn(Optional.empty());

        assertThat(companyService.getById(1L).name()).isEqualTo("Acme Corp");
        assertThatThrownBy(() -> companyService.getById(2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Xóa Company thành công và báo 404 khi không tồn tại")
    void delete_shouldDeleteOrThrowNotFound() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(company));
        when(companyRepository.findById(2L)).thenReturn(Optional.empty());

        companyService.delete(1L);
        verify(companyRepository).deleteById(1L);

        assertThatThrownBy(() -> companyService.delete(2L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(companyRepository, never()).deleteById(2L);
    }

    @Test
    @DisplayName("Lấy danh sách Company phân trang kèm bộ lọc")
    @SuppressWarnings("unchecked")
    void getAll_shouldReturnPagedCompanies() {
        Pageable pageable = PageRequest.of(0, 10);
        CompanyFilterDTO filter = new CompanyFilterDTO("Acme", null, null, null);
        when(companyRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(company), pageable, 1));

        Page<CompanyResponseDTO> page = companyService.getAll(pageable, filter);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).name()).isEqualTo("Acme Corp");
    }
}
