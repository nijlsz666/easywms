package com.easywms.quality;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import com.easywms.inventory.InventoryBalanceRepository;
import com.easywms.security.TenantContext;
import com.easywms.security.WarehouseScopeContext;
import com.easywms.warehouse.WarehouseRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/quality/inspections")
public class QualityInspectionController {
    private final QualityInspectionRepository inspections; private final InventoryBalanceRepository inventory; private final WarehouseRepository warehouses;
    public QualityInspectionController(QualityInspectionRepository inspections,InventoryBalanceRepository inventory,WarehouseRepository warehouses){this.inspections=inspections;this.inventory=inventory;this.warehouses=warehouses;}
    @GetMapping @PreAuthorize("hasAuthority('quality:read')") public ApiResponse<List<QualityInspection>> list(){return ApiResponse.ok(inspections.findAllByTenantIdOrderByCreatedAtDesc(TenantContext.require()).stream().filter(q->WarehouseScopeContext.allows(q.getWarehouseCode())).toList());}
    @PostMapping @PreAuthorize("hasAuthority('quality:inspect')") public ApiResponse<QualityInspection> create(@Valid @RequestBody CreateInspectionRequest r,Authentication auth){
        Long tenant=TenantContext.require();
        if(!WarehouseScopeContext.allows(r.warehouseCode()))throw new BusinessException(HttpStatus.FORBIDDEN,"无权访问该仓库");
        if(warehouses.findByTenantIdAndCode(tenant,r.warehouseCode()).isEmpty())throw new BusinessException(HttpStatus.BAD_REQUEST,"仓库不存在");
        String no=r.inspectionNo()==null||r.inspectionNo().isBlank()?"IQC-"+LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)+"-"+UUID.randomUUID().toString().substring(0,6).toUpperCase():r.inspectionNo();
        if(inspections.findByTenantIdAndInspectionNo(tenant,no).isPresent())throw BusinessException.conflict("质检单号已存在");
        QualityInspection inspection=new QualityInspection(tenant,no,r.sourceDocNo(),r.inspectionType(),r.warehouseCode(),r.sku(),r.skuName(),r.lotNo(),r.inspectedQty(),auth.getName(),r.remark());
        inspections.insert(inspection);
        return ApiResponse.ok(inspection);
    }
    @PostMapping("/{id}/decisions") @PreAuthorize("hasAuthority('quality:decide')") @Transactional public ApiResponse<QualityInspection> decide(@PathVariable Long id,@Valid @RequestBody DecisionRequest r){
        Long tenant=TenantContext.require();
        QualityInspection inspection=inspections.findByTenantIdAndId(tenant,id).orElseThrow(()->BusinessException.notFound("质检单不存在"));
        if(!WarehouseScopeContext.allows(inspection.getWarehouseCode()))throw new BusinessException(HttpStatus.FORBIDDEN,"无权访问该仓库");
        if(!"PENDING".equals(inspection.getStatus()))throw BusinessException.conflict("该质检单已完成处置");
        String status=switch(r.result().toUpperCase()){case "PASS"->"PASS";case "HOLD"->"HOLD";case "REJECT"->"REJECTED";default->throw new BusinessException(HttpStatus.BAD_REQUEST,"处置结果仅支持 PASS、HOLD 或 REJECT");};
        BigDecimal accepted=r.acceptedQty()==null?(status.equals("PASS")?inspection.getInspectedQty():BigDecimal.ZERO):r.acceptedQty();
        BigDecimal rejected=r.rejectedQty()==null?(status.equals("REJECTED")?inspection.getInspectedQty():BigDecimal.ZERO):r.rejectedQty();
        if(accepted.add(rejected).compareTo(inspection.getInspectedQty())>0)throw new BusinessException(HttpStatus.BAD_REQUEST,"合格数与不合格数不能超过检验数");
        inspection.decide(status,accepted,rejected,r.remark());
        String inventoryStatus=status.equals("PASS")?"合格":status.equals("HOLD")?"待检":"冻结";
        inventory.findAllByTenantIdAndWarehouseCodeAndSkuAndLotNo(tenant,inspection.getWarehouseCode(),inspection.getSku(),inspection.getLotNo()).forEach(row->{row.setQualityStatus(inventoryStatus);inventory.updateById(row);});
        inspections.updateById(inspection);
        return ApiResponse.ok(inspection);
    }
    public record CreateInspectionRequest(String inspectionNo,String sourceDocNo,@NotBlank String inspectionType,@NotBlank String warehouseCode,@NotBlank String sku,@NotBlank String skuName,@NotBlank String lotNo,@NotNull @DecimalMin("0.0001") BigDecimal inspectedQty,String remark){}
    public record DecisionRequest(@NotBlank String result,@DecimalMin("0") BigDecimal acceptedQty,@DecimalMin("0") BigDecimal rejectedQty,String remark){}
}
