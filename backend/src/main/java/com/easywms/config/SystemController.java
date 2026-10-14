package com.easywms.config;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import com.easywms.security.TenantContext;
import com.easywms.user.UserAccount;
import com.easywms.user.UserAccountRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/system")
public class SystemController {
    private static final List<String> ALL_PERMISSIONS=List.of("dashboard:read","warehouse:read","warehouse:write","inventory:read","document:read","document:create","document:submit","document:post","approval:read","approval:decide","quality:read","quality:inspect","quality:decide","integration:write","system:user:read","system:user:write","system:config:read","system:config:write");
    private final UserAccountRepository users; private final PasswordEncoder encoder; private final UiConfigRepository configs;
    public SystemController(UserAccountRepository users,PasswordEncoder encoder,UiConfigRepository configs){this.users=users;this.encoder=encoder;this.configs=configs;}
    @GetMapping("/users") @PreAuthorize("hasAuthority('system:user:read')") public ApiResponse<List<UserView>> users(){return ApiResponse.ok(users.findAllByTenantIdOrderByUsername(TenantContext.require()).stream().map(UserView::from).toList());}
    @PostMapping("/users") @PreAuthorize("hasAuthority('system:user:write')") public ApiResponse<UserView> createUser(@Valid @RequestBody CreateUserRequest r){
        if(users.findByTenantIdAndUsername(TenantContext.require(),r.username()).isPresent())throw BusinessException.conflict("用户名已存在");
        UserAccount u=new UserAccount(TenantContext.require(),r.username(),encoder.encode(r.password()),r.displayName(),r.roleCode(),String.join(",",r.permissions()),r.warehouseScope()==null||r.warehouseScope().isEmpty()?"ALL":String.join(",",r.warehouseScope()));
        users.insert(u);
        return ApiResponse.ok(UserView.from(u));
    }
    @PutMapping("/users/{id}/access") @PreAuthorize("hasAuthority('system:user:write')") public ApiResponse<UserView> updateAccess(@PathVariable Long id,@Valid @RequestBody AccessRequest r){
        UserAccount u=users.findByIdAndTenantId(id,TenantContext.require()).orElseThrow(()->BusinessException.notFound("用户不存在"));
        u.updateAccess(r.roleCode(),String.join(",",r.permissions()),r.warehouseScope()==null||r.warehouseScope().isEmpty()?"ALL":String.join(",",r.warehouseScope()),r.enabled());
        users.updateById(u);
        return ApiResponse.ok(UserView.from(u));
    }
    @GetMapping("/roles") @PreAuthorize("hasAuthority('system:user:read')") public ApiResponse<?> roles(){return ApiResponse.ok(List.of(new RoleView("tenant_admin","租户管理员",ALL_PERMISSIONS),new RoleView("warehouse_manager","仓库主管",List.of("dashboard:read","warehouse:read","warehouse:write","inventory:read","document:read","document:create","document:submit","document:post","approval:read","approval:decide","quality:read","quality:inspect","quality:decide")),new RoleView("operator","仓库作业员",List.of("dashboard:read","warehouse:read","inventory:read","document:read","document:create","document:submit")),new RoleView("quality_inspector","质量检验员",List.of("dashboard:read","warehouse:read","inventory:read","document:read","quality:read","quality:inspect","quality:decide"))));}
    @GetMapping("/configs") @PreAuthorize("hasAuthority('system:config:read')") public ApiResponse<List<UiConfigEntity>> configs(){return ApiResponse.ok(configs.findAllByTenantIdOrderByConfigKey(TenantContext.require()));}
    @PutMapping("/configs/{key}") @PreAuthorize("hasAuthority('system:config:write')") public ApiResponse<UiConfigEntity> saveConfig(@PathVariable String key,@Valid @RequestBody ConfigRequest r){
        UiConfigEntity cfg=configs.findByTenantIdAndConfigKey(TenantContext.require(),key).orElseGet(()->new UiConfigEntity(TenantContext.require(),key,r.type(),r.value()));
        cfg.update(r.type(),r.value());
        if(cfg.getId()==null) configs.insert(cfg); else configs.updateById(cfg);
        return ApiResponse.ok(cfg);
    }
    public record UserView(Long id,String username,String displayName,String roleCode,List<String> permissions,String warehouseScope,boolean enabled){static UserView from(UserAccount u){return new UserView(u.getId(),u.getUsername(),u.getDisplayName(),u.getRoleCode(),u.permissions(),u.getWarehouseScope(),u.isEnabled());}}
    public record RoleView(String code,String name,List<String> permissions){}
    public record CreateUserRequest(@NotBlank String username,@NotBlank String password,@NotBlank String displayName,@NotBlank String roleCode,List<String> permissions,List<String> warehouseScope){public CreateUserRequest{permissions=permissions==null?List.of():permissions;}}
    public record AccessRequest(@NotBlank String roleCode,List<String> permissions,List<String> warehouseScope,boolean enabled){public AccessRequest{permissions=permissions==null?List.of():permissions;}}
    public record ConfigRequest(@NotBlank String type,@NotBlank String value){}
}
