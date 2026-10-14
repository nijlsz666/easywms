package com.easywms.document;

import com.easywms.common.ApiResponse;
import com.easywms.common.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/documents")
public class StockDocumentController {
    private final StockDocumentService service;
    public StockDocumentController(StockDocumentService service){this.service=service;}
    @GetMapping @PreAuthorize("hasAuthority('document:read')") public ApiResponse<List<StockDocument>> list(){return ApiResponse.ok(service.list());}
    @PostMapping @PreAuthorize("hasAuthority('document:create')") public ApiResponse<StockDocument> create(@Valid @RequestBody StockDocumentService.CreateDocumentRequest request,org.springframework.security.core.Authentication auth){return ApiResponse.ok(service.create(request,auth.getName()));}
    @PostMapping("/{id}/actions") @PreAuthorize("hasAnyAuthority('document:submit','approval:decide','document:post')") public ApiResponse<StockDocument> action(@PathVariable Long id,@Valid @RequestBody ActionRequest request,Authentication authentication){
        String required=switch(request.action().toUpperCase()){case "SUBMIT","CANCEL"->"document:submit";case "APPROVE","REJECT"->"approval:decide";case "COMPLETE"->"document:post";default->"";};
        if(required.isEmpty()||authentication.getAuthorities().stream().noneMatch(a->required.equals(a.getAuthority())))throw new BusinessException(HttpStatus.FORBIDDEN,"无权执行此单据操作");
        return ApiResponse.ok(service.action(id,request.action()));
    }
    public record ActionRequest(@NotBlank String action){}
}
