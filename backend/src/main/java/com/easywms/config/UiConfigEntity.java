package com.easywms.config;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.Instant;

@TableName("sys_ui_config")
public class UiConfigEntity {
    @TableId(type=IdType.AUTO) private Long id;
    private Long tenantId;
    private String configKey;
    private String configType;
    private String configValue;
    private Instant updatedAt=Instant.now();
    protected UiConfigEntity(){}
    public UiConfigEntity(Long tenantId,String configKey,String configType,String configValue){this.tenantId=tenantId;this.configKey=configKey;this.configType=configType;this.configValue=configValue;}
    public void update(String type,String value){configType=type;configValue=value;updatedAt=Instant.now();}
    public Long getId(){return id;} public Long getTenantId(){return tenantId;} public String getConfigKey(){return configKey;} public String getConfigType(){return configType;} public String getConfigValue(){return configValue;} public Instant getUpdatedAt(){return updatedAt;}
}
