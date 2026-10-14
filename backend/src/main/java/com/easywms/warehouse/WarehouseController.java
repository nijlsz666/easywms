package com.easywms.warehouse;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import com.easywms.security.TenantContext;
import com.easywms.security.WarehouseScopeContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/warehouses")
public class WarehouseController {
    private final WarehouseRepository repo;
    public WarehouseController(WarehouseRepository repo){this.repo=repo;}
    @GetMapping @PreAuthorize("hasAuthority('warehouse:read')")
    public ApiResponse<List<Warehouse>> list(){return ApiResponse.ok(repo.findAllByTenantIdOrderByCode(TenantContext.require()).stream().filter(w->WarehouseScopeContext.allows(w.getCode())).toList());}
    @PostMapping @PreAuthorize("hasAuthority('warehouse:write')")
    public ApiResponse<Warehouse> create(@Valid @RequestBody WarehouseRequest request){
        if(repo.findByTenantIdAndCode(TenantContext.require(),request.code()).isPresent()) throw BusinessException.conflict("仓库编码已存在");
        Warehouse warehouse=new Warehouse(TenantContext.require(),request.code(),request.name(),request.type(),request.address());
        repo.insert(warehouse);
        return ApiResponse.ok(warehouse);
    }
    @GetMapping("/{code}") @PreAuthorize("hasAuthority('warehouse:read')")
    public ApiResponse<Warehouse> get(@PathVariable String code){
        if(!WarehouseScopeContext.allows(code)) throw new BusinessException(HttpStatus.FORBIDDEN,"无权访问该仓库");
        return ApiResponse.ok(repo.findByTenantIdAndCode(TenantContext.require(),code).orElseThrow(()->BusinessException.notFound("仓库不存在")));
    }
    public record WarehouseRequest(@NotBlank String code,@NotBlank String name,@NotBlank String type,String address){}
}
