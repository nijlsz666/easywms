package com.easywms.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("sys_tenant")
public class TenantEntity {
    @TableId(type=IdType.INPUT) private Long id;
    @TableField("tenant_code") private String code;
    private String name;
    private boolean enabled=true;
    protected TenantEntity(){}
    public TenantEntity(Long id,String code,String name){this.id=id;this.code=code;this.name=name;}
    public Long getId(){return id;} public String getCode(){return code;} public String getName(){return name;} public boolean isEnabled(){return enabled;}
}
