package com.easywms.dashboard;

import com.easywms.common.ApiResponse;
import com.easywms.document.StockDocumentRepository;
import com.easywms.inventory.InventoryBalanceRepository;
import com.easywms.security.TenantContext;
import com.easywms.security.WarehouseScopeContext;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.util.Map;
import java.util.stream.Collectors;

@RestController @RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final InventoryBalanceRepository inventory; private final StockDocumentRepository documents;
    public DashboardController(InventoryBalanceRepository inventory,StockDocumentRepository documents){this.inventory=inventory;this.documents=documents;}
    @GetMapping @PreAuthorize("hasAuthority('dashboard:read')") public ApiResponse<?> overview(Authentication authentication){
        boolean inventoryAllowed=has(authentication,"inventory:read"),documentsAllowed=has(authentication,"document:read"),approvalsAllowed=has(authentication,"approval:read");
        var balances=inventoryAllowed?inventory.findAllByTenantIdOrderByUpdatedAtDesc(TenantContext.require()).stream().filter(i->WarehouseScopeContext.allows(i.getWarehouseCode())).toList():java.util.List.<com.easywms.inventory.InventoryBalance>of();
        var visibleDocs=(documentsAllowed||approvalsAllowed)?documents.findAllByTenantIdOrderByCreatedAtDesc(TenantContext.require()).stream().filter(d->(d.getSourceWarehouse()==null||WarehouseScopeContext.allows(d.getSourceWarehouse()))&&(d.getTargetWarehouse()==null||WarehouseScopeContext.allows(d.getTargetWarehouse()))).toList():java.util.List.<com.easywms.document.StockDocument>of();
        Map<String,BigDecimal> inventoryByUom=balances.stream().collect(Collectors.groupingBy(i->i.getUom(),Collectors.mapping(i->i.getQuantity(),Collectors.reducing(BigDecimal.ZERO,BigDecimal::add))));
        return ApiResponse.ok(Map.of("skuCount",balances.stream().map(i->i.getSku()).distinct().count(),"inventoryLines",balances.size(),"inventoryByUom",inventoryByUom,"pendingApprovals",approvalsAllowed?visibleDocs.stream().filter(d->"PENDING_APPROVAL".equals(d.getStatus())).count():0,"openDocuments",documentsAllowed?visibleDocs.stream().filter(d->!java.util.List.of("COMPLETED","CANCELLED","REJECTED").contains(d.getStatus())).count():0,"recentDocuments",documentsAllowed?visibleDocs.stream().limit(8).toList():java.util.List.of()));
    }
    private boolean has(Authentication authentication,String permission){return authentication.getAuthorities().stream().anyMatch(a->permission.equals(a.getAuthority()));}
}
