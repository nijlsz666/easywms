package com.easywms.security;

import com.easywms.user.UserAccount;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationSeconds;
    public JwtService(@Value("${easywms.jwt.secret}") String secret, @Value("${easywms.jwt.expiration-seconds}") long expirationSeconds) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.expirationSeconds = expirationSeconds;
    }
    public String issue(UserAccount user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getUsername()).claim("uid", user.getId()).claim("tenantId", user.getTenantId())
                .claim("role", user.getRoleCode()).claim("permissions", user.permissions()).claim("warehouseScope", user.getWarehouseScope())
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(expirationSeconds))).signWith(key).compact();
    }
    public io.jsonwebtoken.Claims parse(String token) { return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); }
    public long expirationSeconds() { return expirationSeconds; }
}
