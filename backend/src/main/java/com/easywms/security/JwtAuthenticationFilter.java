package com.easywms.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    public JwtAuthenticationFilter(JwtService jwtService) { this.jwtService = jwtService; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                Claims claims = jwtService.parse(header.substring(7));
                Long tenantId = claims.get("tenantId", Number.class).longValue();
                TenantContext.set(tenantId);
                WarehouseScopeContext.set(claims.get("warehouseScope", String.class));
                @SuppressWarnings("unchecked") List<String> permissions = claims.get("permissions", List.class);
                var authorities = permissions.stream().map(SimpleGrantedAuthority::new).toList();
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities));
                request.setAttribute("tenantId", tenantId);
            }
        } catch (Exception ignored) {
            SecurityContextHolder.clearContext();
        }
        try { chain.doFilter(request, response); }
        finally { TenantContext.clear(); WarehouseScopeContext.clear(); }
    }
}
