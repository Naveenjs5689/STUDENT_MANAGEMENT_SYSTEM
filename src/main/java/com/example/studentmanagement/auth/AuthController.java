
package com.example.studentmanagement.auth;

import com.example.studentmanagement.security.DemoTokenStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final DemoTokenStore tokenStore;

    private final String admin1User;
    private final String admin1Pass;
    private final String admin2User;
    private final String admin2Pass;
    private final String studentUser;
    private final String studentPass;

    public AuthController(
            DemoTokenStore tokenStore,
            @Value("${app.demo.admin1.username}") String admin1User,
            @Value("${app.demo.admin1.password}") String admin1Pass,
            @Value("${app.demo.admin2.username}") String admin2User,
            @Value("${app.demo.admin2.password}") String admin2Pass,
            @Value("${app.demo.student.username}") String studentUser,
            @Value("${app.demo.student.password}") String studentPass) {

        this.tokenStore = tokenStore;
        this.admin1User = admin1User;
        this.admin1Pass = admin1Pass;
        this.admin2User = admin2User;
        this.admin2Pass = admin2Pass;
        this.studentUser = studentUser;
        this.studentPass = studentPass;
    }

    @PostMapping("/login")
    public LoginResponse login(
            @Valid @RequestBody LoginRequest request) {

        String role;

        if (request.username().equals(admin1User)
                && request.password().equals(admin1Pass)) {

            role = "ADMIN";

        } else if (request.username().equals(admin2User)
                && request.password().equals(admin2Pass)) {

            role = "ADMIN";

        } else if (request.username().equals(studentUser)
                && request.password().equals(studentPass)) {

            role = "STUDENT";

        } else {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid username or password"
            );
        }

        String token = tokenStore.create(
                request.username(), role
        );

        return new LoginResponse(
                "Login successful",
                request.username(),
                role,
                token
        );
    }

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}

    public record LoginResponse(
            String message,
            String username,
            String role,
            String token
    ) {}
}
