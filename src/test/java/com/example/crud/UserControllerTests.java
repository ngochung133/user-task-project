package com.example.crud;

import com.example.crud.controller.UserController;
import com.example.crud.model.User;
import com.example.crud.repository.UserRepository;
import com.example.crud.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTests {
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        UserRepository repository = (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(), new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findAll" -> List.of(new User(1L, "An", "an@example.com", "secret123", "Hanoi"));
                    case "existsByEmail" -> false;
                    case "findById" -> Optional.of(new User(7L, "Old name", "old@example.com", "oldpassword", "Hue"));
                    case "save" -> {
                        User user = (User) args[0];
                        if (user.getId() == null) {
                            user.setId(1L);
                        }
                        yield user;
                    }
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        mvc = MockMvcBuilders.standaloneSetup(new UserController(new UserService(repository))).build();
    }

    @Test
    void listUsersReturnsDataWithoutPassword() throws Exception {
        mvc.perform(get("/users"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"data\":[{\"id\":1")))
                .andExpect(content().string(containsString("an@example.com")))
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("secret123"))));
    }

    @Test
    void updateUserUsesPathIdAndReturnsUpdatedDataWithoutPassword() throws Exception {
        mvc.perform(put("/users/7").contentType(MediaType.APPLICATION_JSON).content("""
                        {"id":99,"name":"Updated name","email":"updated@example.com","password":"newpassword","address":"Hanoi"}
                        """))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"id\":7")))
                .andExpect(content().string(containsString("Updated name")))
                .andExpect(content().string(containsString("updated@example.com")))
                .andExpect(content().string(containsString("Hanoi")))
                .andExpect(content().string(not(containsString("password"))));
    }

    @Test
    void createUserReturnsSavedDataWithoutPassword() throws Exception {
        mvc.perform(post("/users").contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"An","email":"an@example.com","password":"secret123","address":"Hanoi"}
                        """))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("\"id\":1")))
                .andExpect(content().string(containsString("an@example.com")))
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("secret123"))));
    }
}
