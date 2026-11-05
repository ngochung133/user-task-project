package com.example.crud.modules.user.service.impl;

import com.example.crud.modules.user.entity.User;
import com.example.crud.modules.user.repository.UserRepository;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

    import java.lang.module.ResolutionException;
    import java.util.List;
    import java.util.Optional;

    import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.crud.modules.user.dto.UserResponseDTO;
import com.example.crud.global.exception.ResourceAlreadyExistException;
import com.example.crud.global.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock 
    private PasswordEncoder passwordEncoder;

    @InjectMocks 
    private UserServiceImpl userService;

    private User mockUser;

    @BeforeEach 
    void setUp(){
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@gmail.com");
        mockUser.setName("Test");
        mockUser.setPassword("123456");
    }

    @Test 
    @DisplayName("Lấy danh sách user")
    
    void testfetchAllUser(){
        when(userRepository.findAll()).thenReturn(List.of(mockUser));
        List<UserResponseDTO> result = userService.fetchAllUser();
        assertEquals(1L, result.get(0).getId());
        assertEquals("Test", result.get(0).getName());
        verify(userRepository).findAll();
    }

    @Nested 
    @DisplayName ("Khi tạo User thành công")
    
    class WhenCreateUserSucceeds{

        @Test 
        @DisplayName ("Tạo User thành công và trả về User đã được lưu")
        
        void createUser_shouldReturnUser(){
            String hashPassword = "encoded_passwood";

            User userSaved = new User();
            userSaved.setId(1L);
            userSaved.setEmail("test@gmail.com");
            userSaved.setPassword(hashPassword);
            when(userRepository.save(any(User.class))).thenReturn(userSaved);
            when(passwordEncoder.encode(mockUser.getPassword())).thenReturn(hashPassword);
            when(userRepository.existsByEmail(mockUser.getEmail())).thenReturn(false);
            UserResponseDTO result = userService.createUser(mockUser);
            
            //Check user before save in database, having id is null
            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass((User.class));
            verify(userRepository).save(userCaptor.capture());
            User userToSave = userCaptor.getValue();
            assertThat(userToSave.getId()).isEqualTo(null);
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(userSaved.getId());
            assertThat(result.getEmail()).isEqualTo(userSaved.getEmail());
            verify(userRepository).existsByEmail(mockUser.getEmail());
            verify(passwordEncoder).encode("123456");
            verify(userRepository).save(mockUser);
        }   

        @Test 
        @DisplayName ("Kiểm tra mật khẩu được mã hoá trước khi save xuống database")
        void createUser_shouldEncodePasswordBeforeSave(){
        User userSaved = new User();
            String hashPassword = "encoded_passwood";
            userSaved.setId(1L);
            userSaved.setEmail("test@gmail.com");
            userSaved.setPassword(hashPassword);
            when(userRepository.existsByEmail(mockUser.getEmail())).thenReturn(false);
            when(passwordEncoder.encode(mockUser.getPassword())).thenReturn(hashPassword);
            when(userRepository.save(any(User.class))).thenReturn(userSaved);
            userService.createUser(mockUser);

            //lấy user trong creater(user) ra kiểm tra
            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(userCaptor.capture());
            User userParameter = userCaptor.getValue();
            assertThat(userParameter.getPassword()).isEqualTo(hashPassword);
            
        }
    }

    @Nested 
    @DisplayName ("Khi tạo user thất bại")
    class WhenCreateUserFail{
        
        @Test
        @DisplayName ("Email đã tồn tại: ném ResourceAlreadyExistException với message chứa email")

        void createrUser_whenEmailExists(){


            when(userRepository.existsByEmail(mockUser.getEmail())).thenReturn(true);

            assertThatThrownBy(() -> userService.createUser(mockUser))
                    .isInstanceOf(ResourceAlreadyExistException.class)
                    // chứa chuỗi con
                    .hasMessageContaining("test@gmail.com");
        }
        
        @Test
        @DisplayName ("Email tồn tại thì không lưu vào database")
        void createrUser_whenEmailExists_shouldNotSave(){
            
            when(userRepository.existsByEmail(mockUser.getEmail())).thenReturn(true);
            assertThatThrownBy(() -> userService.createUser(mockUser))
            .isInstanceOf(ResourceAlreadyExistException.class)
            .hasMessageContaining("test@gmail.com");
            verify(userRepository,never()).save(any(User.class));
        }
    }

    @Nested 
    @DisplayName("Xoá User")
    
    class deleteUser{

        @Test
        @DisplayName ("Xoá User thành công")
        void delteUser_whenExistUser(){
            when(userRepository.findById(mockUser.getId())).thenReturn(Optional.of(mockUser));

            userService.deleteUserByID(1L);
            verify(userRepository).findById(1L);
        }

        @Test 
        @DisplayName("Xoá User không thành công")
        void deleteUser_whenNotExistUser() {
    when(userRepository.findById(1L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.deleteUserByID(1L))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("1");

    verify(userRepository, never()).deleteById(anyLong());
        }
    }

    @Nested 
    @DisplayName ("Update User")

    class UpdateUserSucced{

        @Test
        @DisplayName ("Update User thành công")
        void updateUser_shouldReturnNewUpdate(){
            User updatUser = new User();
            updatUser.setEmail("new@gmail.com");
            updatUser.setName("New");
            updatUser.setPassword("newPassword");
            updatUser.setAddress("newAddress");
            String hashPassword = "encoded_Password";

            when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
            when(userRepository.existsByEmail(updatUser.getEmail())).thenReturn(false);
            when(passwordEncoder.encode(updatUser.getPassword())).thenReturn(hashPassword);
            when(userRepository.save(any(User.class))).thenReturn(mockUser);

            UserResponseDTO result = userService.updateUser(1L, updatUser);

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(userCaptor.capture());
            User userToSave = userCaptor.getValue();
            assertThat(userToSave.getPassword()).isEqualTo(hashPassword);
            assertThat(result.getEmail()).isEqualTo(mockUser.getEmail());
            assertThat(result.getEmail()).isEqualTo(updatUser.getEmail());
            assertThat(result.getName()).isEqualTo(updatUser.getName());
        }
    }

    @Nested
    @DisplayName ("Update User thất bại")
    
    class updateUserFail{

        @Test 
        @DisplayName ("Không tìm thấy User")

        void updateUser_UserNotExist(){

            User updateUser = new User();

            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.updateUser(1L,updateUser))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("1");

            verify(userRepository,never()).save(any(User.class));
        }

        @Test
        @DisplayName ("Email cập nhật bị trùng")

        void updateUser_whenEmailDuplicate(){

            User updateUser = new User();
            updateUser.setEmail("duplicate@gmail.com");
            when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
            when(userRepository.existsByEmail(updateUser.getEmail())).thenReturn(true);

            assertThatThrownBy(() -> userService.updateUser(1L, updateUser))
            .isInstanceOf(ResourceAlreadyExistException.class)
            .hasMessageContaining(updateUser.getEmail());
            
            verify(userRepository).findById(1L);
            verify(userRepository,never()).save(any(User.class));
        }
    }
}
