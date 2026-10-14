package com.easywms.inventory;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.Instant;

@TableName("wms_inventory_balance")
public class InventoryBalance {
    @TableId(type=IdType.AUTO) private Long id;
    private Long tenantId;
    private String warehouseCode;
    private String locationCode;
    private String sku;
    private String skuName;
    private String lotNo;
    private BigDecimal quantity;
    private String uom;
    private String qualityStatus="合格";
    private Instant updatedAt=Instant.now();
    protected InventoryBalance(){}
    public InventoryBalance(Long tenantId,String warehouseCode,String locationCode,String sku,String skuName,String lotNo,BigDecimal quantity,String uom){this.tenantId=tenantId;this.warehouseCode=warehouseCode;this.locationCode=locationCode;this.sku=sku;this.skuName=skuName;this.lotNo=lotNo;this.quantity=quantity;this.uom=uom;}
    public void add(BigDecimal amount){quantity=quantity.add(amount);updatedAt=Instant.now();}
    public void setQuantity(BigDecimal quantity){this.quantity=quantity;updatedAt=Instant.now();}
    public void setQualityStatus(String status){qualityStatus=status;updatedAt=Instant.now();}
    public Long getId(){return id;} public Long getTenantId(){return tenantId;} public String getWarehouseCode(){return warehouseCode;} public String getLocationCode(){return locationCode;} public String getSku(){return sku;} public String getSkuName(){return skuName;} public String getLotNo(){return lotNo;} public BigDecimal getQuantity(){return quantity;} public String getUom(){return uom;} public String getQualityStatus(){return qualityStatus;} public Instant getUpdatedAt(){return updatedAt;}
}
