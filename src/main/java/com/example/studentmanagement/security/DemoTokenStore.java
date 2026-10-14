
package com.example.studentmanagement.security;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DemoTokenStore {

    private final Map<String, TokenUser> tokens =
            new ConcurrentHashMap<>();

    public String create(String username, String role) {

        String token = UUID.randomUUID().toString();

        tokens.put(token, new TokenUser(username, role));

        return token;
    }

    public TokenUser find(String token) {
        return tokens.get(token);
    }

    public record TokenUser(String username, String role) {}
}
