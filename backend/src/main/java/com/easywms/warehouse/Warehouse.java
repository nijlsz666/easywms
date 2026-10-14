package com.easywms.warehouse;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("wms_warehouse")
public class Warehouse {
    @TableId(type = IdType.AUTO) private Long id;
    private Long tenantId;
    @TableField("warehouse_code") private String code;
    private String name;
    private String type;
    private String address;
    private boolean enabled=true;
    protected Warehouse() { }
    public Warehouse(Long tenantId, String code, String name, String type, String address) { this.tenantId=tenantId; this.code=code; this.name=name; this.type=type; this.address=address; }
    public Long getId(){return id;} public Long getTenantId(){return tenantId;} public String getCode(){return code;} public String getName(){return name;} public String getType(){return type;} public String getAddress(){return address;} public boolean isEnabled(){return enabled;}
}
