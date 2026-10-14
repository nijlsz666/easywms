package com.easywms.auth;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import com.easywms.security.JwtService;
import com.easywms.user.UserAccount;
import com.easywms.user.UserAccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;

@RestController @RequestMapping("/api/v1/auth")
public class AuthController {
    private final UserAccountRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
    @Value("${easywms.sso.enabled:false}") private boolean ssoEnabled;
    public AuthController(UserAccountRepository users, PasswordEncoder encoder, JwtService jwt) { this.users = users; this.encoder = encoder; this.jwt = jwt; }
    @PostMapping("/login") public ApiResponse<?> login(@Valid @RequestBody LoginRequest request) {
        UserAccount user = users.findByTenantIdAndUsername(request.tenantId(), request.username()).orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "租户、用户名或密码错误"));
        if (!user.isEnabled() || !encoder.matches(request.password(), user.getPasswordHash())) throw new BusinessException(HttpStatus.UNAUTHORIZED, "租户、用户名或密码错误");
        return ApiResponse.ok(Map.of("accessToken", jwt.issue(user), "tokenType", "Bearer", "expiresIn", jwt.expirationSeconds(), "user", Map.of("id", user.getId(), "tenantId", user.getTenantId(), "username", user.getUsername(), "displayName", user.getDisplayName(), "role", user.getRoleCode(), "permissions", user.permissions())));
    }
    @GetMapping("/me") public ApiResponse<?> currentUser(Authentication authentication) {
        Long tenantId=com.easywms.security.TenantContext.require();
        UserAccount user=users.findByTenantIdAndUsername(tenantId,authentication.getName()).orElseThrow(()->BusinessException.notFound("用户不存在"));
        return ApiResponse.ok(Map.of("id",user.getId(),"tenantId",tenantId,"username",user.getUsername(),"displayName",user.getDisplayName(),"role",user.getRoleCode(),"permissions",user.permissions()));
    }
    @GetMapping("/sso/config") public ApiResponse<?> ssoConfig() { return ApiResponse.ok(Map.of("enabled", ssoEnabled, "protocol", "OIDC", "provider", "corporate")); }
    @GetMapping("/sso/start") public void startSso(@RequestParam(defaultValue="web") String client, HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (!ssoEnabled) { response.sendError(HttpStatus.NOT_FOUND.value()); return; }
        if (!client.equals("web") && !client.equals("pda")) { response.sendError(HttpStatus.BAD_REQUEST.value(), "Unsupported SSO client"); return; }
        request.getSession(true).setAttribute("easywms.sso.client", client);
        response.sendRedirect("/oauth2/authorization/corporate");
    }
    public record LoginRequest(@NotNull Long tenantId, @NotBlank String username, @NotBlank String password) { }
}
