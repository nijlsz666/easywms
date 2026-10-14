package com.easywms.quality;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.math.BigDecimal;
import java.time.Instant;

@TableName("wms_quality_inspection")
public class QualityInspection {
    @TableId(type=IdType.AUTO) private Long id;
    private Long tenantId;
    private String inspectionNo;
    private String sourceDocNo;
    private String inspectionType;
    private String warehouseCode;
    private String sku;
    private String skuName;
    private String lotNo;
    private String status="PENDING";
    private BigDecimal inspectedQty;
    private BigDecimal acceptedQty;
    private BigDecimal rejectedQty;
    private String inspector;
    private String remark;
    private Instant createdAt=Instant.now();
    private Instant decidedAt;
    protected QualityInspection(){}
    public QualityInspection(Long tenantId,String inspectionNo,String sourceDocNo,String inspectionType,String warehouseCode,String sku,String skuName,String lotNo,BigDecimal inspectedQty,String inspector,String remark){this.tenantId=tenantId;this.inspectionNo=inspectionNo;this.sourceDocNo=sourceDocNo;this.inspectionType=inspectionType;this.warehouseCode=warehouseCode;this.sku=sku;this.skuName=skuName;this.lotNo=lotNo;this.inspectedQty=inspectedQty;this.inspector=inspector;this.remark=remark;}
    public void decide(String result,BigDecimal accepted,BigDecimal rejected,String note){this.status=result;this.acceptedQty=accepted;this.rejectedQty=rejected;if(note!=null&&!note.isBlank())this.remark=note;this.decidedAt=Instant.now();}
    public Long getId(){return id;} public Long getTenantId(){return tenantId;} public String getInspectionNo(){return inspectionNo;} public String getSourceDocNo(){return sourceDocNo;} public String getInspectionType(){return inspectionType;} public String getWarehouseCode(){return warehouseCode;} public String getSku(){return sku;} public String getSkuName(){return skuName;} public String getLotNo(){return lotNo;} public String getStatus(){return status;} public BigDecimal getInspectedQty(){return inspectedQty;} public BigDecimal getAcceptedQty(){return acceptedQty;} public BigDecimal getRejectedQty(){return rejectedQty;} public String getInspector(){return inspector;} public String getRemark(){return remark;} public Instant getCreatedAt(){return createdAt;} public Instant getDecidedAt(){return decidedAt;}
}
