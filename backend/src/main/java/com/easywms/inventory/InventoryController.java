package com.easywms.inventory;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import com.easywms.security.TenantContext;
import com.easywms.security.WarehouseScopeContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final InventoryBalanceRepository repo;
    public InventoryController(InventoryBalanceRepository repo){this.repo=repo;}
    @GetMapping @PreAuthorize("hasAuthority('inventory:read')")
    public ApiResponse<List<InventoryBalance>> list(@RequestParam(required=false) String warehouse,@RequestParam(required=false) String sku){
        if(warehouse!=null&&!WarehouseScopeContext.allows(warehouse)) throw new BusinessException(HttpStatus.FORBIDDEN,"无权访问该仓库");
        return ApiResponse.ok(repo.findAllByTenantIdOrderByUpdatedAtDesc(TenantContext.require()).stream().filter(i->WarehouseScopeContext.allows(i.getWarehouseCode())).filter(i->warehouse==null||i.getWarehouseCode().equals(warehouse)).filter(i->sku==null||i.getSku().toLowerCase().contains(sku.toLowerCase())).toList());
    }
}
