package com.easywms.config;

import com.easywms.auth.AuthController;
import com.easywms.common.ApiSecurityErrorWriter;
import com.easywms.common.BusinessException;
import com.easywms.security.JwtAuthenticationFilter;
import com.easywms.security.JwtService;
import com.easywms.user.UserAccount;
import com.easywms.user.UserAccountRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.util.UriUtils;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableMethodSecurity
@Profile("sso")
public class SsoSecurityConfig {
    @Bean SecurityFilterChain ssoSecurityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter, AuthenticationSuccessHandler wmsSsoSuccessHandler, ApiSecurityErrorWriter errors) throws Exception {
        return http.csrf(csrf->csrf.disable()).cors(cors->{})
                .sessionManagement(sm->sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth->auth.requestMatchers("/api/v1/auth/login","/api/v1/auth/sso/config","/api/v1/auth/sso/start","/oauth2/**","/login/**","/docs","/swagger-ui/**","/openapi.json","/v3/api-docs/**").permitAll().anyRequest().authenticated())
                .exceptionHandling(handler -> handler
                        .authenticationEntryPoint((request, response, exception) -> errors.write(response, HttpStatus.UNAUTHORIZED, "未认证或登录已过期"))
                        .accessDeniedHandler((request, response, exception) -> errors.write(response, HttpStatus.FORBIDDEN, "无权访问该资源")))
                .oauth2Login(oauth->oauth.successHandler(wmsSsoSuccessHandler))
                .addFilterBefore(jwtFilter,UsernamePasswordAuthenticationFilter.class).build();
    }
    @Bean AuthenticationSuccessHandler wmsSsoSuccessHandler(UserAccountRepository users,JwtService jwt,
            @Value("${easywms.sso.tenant-id}") Long tenantId,
            @Value("${easywms.sso.web-redirect-url:${easywms.sso.frontend-redirect-url:http://localhost:5173}}") String webFrontendUrl,
            @Value("${easywms.sso.pda-redirect-url:http://localhost:5174}") String pdaFrontendUrl){
        return (HttpServletRequest request,HttpServletResponse response,Authentication authentication)->{
            OAuth2AuthenticationToken oauth=(OAuth2AuthenticationToken)authentication;
            String externalUser=firstNonBlank(oauth.getPrincipal().getAttribute("preferred_username"),oauth.getPrincipal().getAttribute("email"),oauth.getName());
            UserAccount user=users.findByTenantIdAndUsername(tenantId,externalUser).filter(UserAccount::isEnabled).orElse(null);
            var session=request.getSession(false);
            String client=session!=null&&"pda".equals(session.getAttribute("easywms.sso.client"))?"pda":"web";
            String frontendUrl=("pda".equals(client)?pdaFrontendUrl:webFrontendUrl).replaceAll("/+$","");
            if(user==null){if(session!=null)session.invalidate();response.sendRedirect(frontendUrl+"/?sso_error=user_not_provisioned");return;}
            String token=UriUtils.encode(jwt.issue(user),StandardCharsets.UTF_8);
            if(session!=null)session.invalidate();
            response.sendRedirect(frontendUrl+"/#token="+token);
        };
    }
    private static String firstNonBlank(String... values){for(String value:values)if(value!=null&&!value.isBlank())return value;return "";}
}
