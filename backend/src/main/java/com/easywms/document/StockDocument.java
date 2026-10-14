package com.easywms.document;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.Instant;

@TableName("wms_stock_document")
public class StockDocument {
    @TableId(type=IdType.AUTO) private Long id;
    private Long tenantId;
    private String docNo;
    private String docType;
    private String status="DRAFT";
    private String sourceWarehouse;
    private String targetWarehouse;
    private String sourceLocation;
    private String targetLocation;
    private String businessPartner;
    private String sku;
    private String skuName;
    private BigDecimal quantity;
    private String uom;
    private String createdBy;
    private Instant createdAt=Instant.now();
    private Instant updatedAt=Instant.now();
    private String lotNo;
    protected StockDocument(){}
    public StockDocument(Long tenantId,String docNo,String docType,String sourceWarehouse,String targetWarehouse,String sourceLocation,String targetLocation,String businessPartner,String sku,String skuName,String lotNo,BigDecimal quantity,String uom,String createdBy){this.tenantId=tenantId;this.docNo=docNo;this.docType=docType;this.sourceWarehouse=sourceWarehouse;this.targetWarehouse=targetWarehouse;this.sourceLocation=sourceLocation;this.targetLocation=targetLocation;this.businessPartner=businessPartner;this.sku=sku;this.skuName=skuName;this.lotNo=lotNo;this.quantity=quantity;this.uom=uom;this.createdBy=createdBy;}
    public void setStatus(String status){this.status=status;this.updatedAt=Instant.now();}
    public Long getId(){return id;} public Long getTenantId(){return tenantId;} public String getDocNo(){return docNo;} public String getDocType(){return docType;} public String getStatus(){return status;} public String getSourceWarehouse(){return sourceWarehouse;} public String getTargetWarehouse(){return targetWarehouse;} public String getSourceLocation(){return sourceLocation;} public String getTargetLocation(){return targetLocation;} public String getBusinessPartner(){return businessPartner;} public String getSku(){return sku;} public String getSkuName(){return skuName;} public String getLotNo(){return lotNo;} public BigDecimal getQuantity(){return quantity;} public String getUom(){return uom;} public String getCreatedBy(){return createdBy;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
