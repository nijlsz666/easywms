package com.easywms.integration;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import com.easywms.document.StockDocument;
import com.easywms.document.StockDocumentRepository;
import com.easywms.document.StockDocumentService;
import com.easywms.security.TenantContext;
import com.easywms.security.WarehouseScopeContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;

@RestController @RequestMapping("/api/v1/integrations")
public class IntegrationController {
    private final StockDocumentService documents; private final StockDocumentRepository repository;
    public IntegrationController(StockDocumentService documents,StockDocumentRepository repository){this.documents=documents;this.repository=repository;}
    @GetMapping("/health") @PreAuthorize("hasAuthority('integration:write')") public ApiResponse<?> health(){return ApiResponse.ok(Map.of("status","UP","tenantId",TenantContext.require()));}
    @PostMapping("/erp/movements") @PreAuthorize("hasAuthority('integration:write')") public ApiResponse<StockDocument> erpMovement(@Valid @RequestBody ErpMovementRequest r,Authentication auth){
        Long tenant=TenantContext.require();
        var existing=repository.findByTenantIdAndDocNo(tenant,r.externalDocNo());
        if(existing.isPresent()){
            StockDocument document=existing.get();
            if((document.getSourceWarehouse()!=null&&!WarehouseScopeContext.allows(document.getSourceWarehouse()))
                    ||(document.getTargetWarehouse()!=null&&!WarehouseScopeContext.allows(document.getTargetWarehouse()))) {
                throw new BusinessException(org.springframework.http.HttpStatus.FORBIDDEN,"无权访问该仓库的外部单据");
            }
            return ApiResponse.ok(document);
        }
        String type=switch(r.movementType()){case "GOODS_RECEIPT"->"MIGO_IN";case "GOODS_ISSUE"->"MIGO_OUT";case "TRANSFER"->"TRANSFER";default->throw new BusinessException(org.springframework.http.HttpStatus.BAD_REQUEST,"movementType 仅支持 GOODS_RECEIPT、GOODS_ISSUE、TRANSFER");};
        return ApiResponse.ok(documents.create(new StockDocumentService.CreateDocumentRequest(r.externalDocNo(),type,r.sourceWarehouse(),r.sourceLocation(),r.targetWarehouse(),r.targetLocation(),r.businessPartner(),r.sku(),r.skuName(),r.lotNo(),r.quantity(),r.uom()),auth.getName()));
    }
    public record ErpMovementRequest(@NotBlank String externalDocNo,@NotBlank String movementType,String sourceWarehouse,String sourceLocation,String targetWarehouse,String targetLocation,String businessPartner,@NotBlank String sku,@NotBlank String skuName,String lotNo,@NotNull @Positive BigDecimal quantity,@NotBlank String uom){}
}
