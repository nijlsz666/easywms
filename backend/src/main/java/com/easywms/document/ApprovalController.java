package com.easywms.document;

import com.easywms.common.ApiResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/approvals")
public class ApprovalController {
    private final StockDocumentService documents;
    public ApprovalController(StockDocumentService documents){this.documents=documents;}
    @GetMapping("/pending") @PreAuthorize("hasAuthority('approval:read')") public ApiResponse<List<StockDocument>> pending(){return ApiResponse.ok(documents.list().stream().filter(d->"PENDING_APPROVAL".equals(d.getStatus())).toList());}
}
