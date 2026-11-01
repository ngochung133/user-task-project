package com.example.exception;

import com.example.crud.model.User;
import jakarta.validation.Valid;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTests {
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new InputController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void invalidBodyReturnsFieldErrorsWithoutExposingPassword() throws Exception {
        mvc.perform(post("/input").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"An","email":"invalid","password":"123","address":"Hanoi"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("\"statusCode\":400")))
                .andExpect(content().string(containsString("email: email format is incorrect")))
                .andExpect(content().string(containsString("password: password length min = 6")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("123"))));
    }

    @Test
    void invalidPathParameterReturnsItsNameAndExpectedType() throws Exception {
        mvc.perform(get("/input/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("\"statusCode\":400")))
                .andExpect(content().string(containsString("id")))
                .andExpect(content().string(containsString("Long")));
    }

    @RestController
    static class InputController {
        @PostMapping("/input")
        public void validate(@Valid @RequestBody User user) {
        }

        @GetMapping("/input/{id}")
        public Long convert(@PathVariable("id") Long id) {
            return id;
        }
    }
}
