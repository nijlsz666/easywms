package com.easywms.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Arrays;
import java.util.List;

@TableName("sys_user")
public class UserAccount {
    @TableId(type = IdType.AUTO) private Long id;
    private Long tenantId;
    private String username;
    private String passwordHash;
    private String displayName;
    private String roleCode;
    private String permissionCodes;
    private String warehouseScope;
    private boolean enabled = true;

    protected UserAccount() { }
    public UserAccount(Long tenantId, String username, String passwordHash, String displayName, String roleCode, String permissionCodes, String warehouseScope) {
        this.tenantId = tenantId; this.username = username; this.passwordHash = passwordHash;
        this.displayName = displayName; this.roleCode = roleCode; this.permissionCodes = permissionCodes; this.warehouseScope = warehouseScope; this.enabled = true;
    }
    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getDisplayName() { return displayName; }
    public String getRoleCode() { return roleCode; }
    public String getWarehouseScope() { return warehouseScope; }
    public boolean isEnabled() { return enabled; }
    public List<String> permissions() { return Arrays.stream(permissionCodes.split(",")).filter(s -> !s.isBlank()).toList(); }
    public void updateAccess(String roleCode, String permissionCodes, String warehouseScope, boolean enabled) { this.roleCode=roleCode; this.permissionCodes=permissionCodes; this.warehouseScope=warehouseScope; this.enabled=enabled; }
}
