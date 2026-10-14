package com.easywms.document;

import com.easywms.common.BusinessException;
import com.easywms.inventory.InventoryBalance;
import com.easywms.inventory.InventoryBalanceRepository;
import com.easywms.security.TenantContext;
import com.easywms.security.WarehouseScopeContext;
import com.easywms.warehouse.WarehouseRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class StockDocumentService {
    private final StockDocumentRepository documents; private final InventoryBalanceRepository inventory; private final WarehouseRepository warehouses;
    public StockDocumentService(StockDocumentRepository documents, InventoryBalanceRepository inventory, WarehouseRepository warehouses){this.documents=documents;this.inventory=inventory;this.warehouses=warehouses;}
    public List<StockDocument> list(){
        return documents.findAllByTenantIdOrderByCreatedAtDesc(TenantContext.require()).stream()
                .filter(d->(d.getSourceWarehouse()==null||WarehouseScopeContext.allows(d.getSourceWarehouse()))&&(d.getTargetWarehouse()==null||WarehouseScopeContext.allows(d.getTargetWarehouse()))).toList();
    }
    @Transactional public StockDocument create(CreateDocumentRequest r,String username){
        validateType(r.docType()); validateWarehouse(r.sourceWarehouse()); validateWarehouse(r.targetWarehouse());
        if(!"COUNT".equals(r.docType())&&r.quantity().signum()<=0) throw new BusinessException(HttpStatus.BAD_REQUEST,"非盘点单据数量必须大于零");
        if(r.sourceWarehouse()!=null&&!WarehouseScopeContext.allows(r.sourceWarehouse())||r.targetWarehouse()!=null&&!WarehouseScopeContext.allows(r.targetWarehouse())) throw new BusinessException(HttpStatus.FORBIDDEN,"无权在该仓库创建单据");
        String no=r.docNo()==null||r.docNo().isBlank()?"WMS-"+LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)+"-"+UUID.randomUUID().toString().substring(0,6).toUpperCase():r.docNo();
        if(documents.existsByTenantIdAndDocNo(TenantContext.require(),no)) throw BusinessException.conflict("单据编号已存在");
        StockDocument document=new StockDocument(TenantContext.require(),no,r.docType(),r.sourceWarehouse(),r.targetWarehouse(),r.sourceLocation(),r.targetLocation(),r.businessPartner(),r.sku(),r.skuName(),r.lotNo()==null?"":r.lotNo(),r.quantity(),r.uom(),username);
        documents.insert(document);
        return document;
    }
    @Transactional public StockDocument action(Long id,String action){
        StockDocument d=documents.findByTenantIdAndId(TenantContext.require(),id).orElseThrow(()->BusinessException.notFound("单据不存在"));
        if((d.getSourceWarehouse()!=null&&!WarehouseScopeContext.allows(d.getSourceWarehouse()))
                ||(d.getTargetWarehouse()!=null&&!WarehouseScopeContext.allows(d.getTargetWarehouse()))) {
            throw new BusinessException(HttpStatus.FORBIDDEN,"无权操作该仓库的单据");
        }
        switch(action.toUpperCase()){
            case "SUBMIT" -> {requireStatus(d,"DRAFT");d.setStatus("PENDING_APPROVAL");}
            case "APPROVE" -> {requireStatus(d,"PENDING_APPROVAL");d.setStatus("APPROVED");}
            case "REJECT" -> {requireStatus(d,"PENDING_APPROVAL");d.setStatus("REJECTED");}
            case "CANCEL" -> {requireStatus(d,"DRAFT");d.setStatus("CANCELLED");}
            case "COMPLETE" -> {requireStatus(d,"APPROVED");post(d);d.setStatus("COMPLETED");}
            default -> throw new BusinessException(HttpStatus.BAD_REQUEST,"不支持的单据操作");
        }
        documents.updateById(d);
        return d;
    }
    private void post(StockDocument d){
        switch(d.getDocType()){
            case "INBOUND","MIGO_IN","RETURN_IN" -> add(d,d.getTargetWarehouse(),d.getTargetLocation(),d.getQuantity());
            case "OUTBOUND","MIGO_OUT","GA_OUT" -> add(d,d.getSourceWarehouse(),d.getSourceLocation(),d.getQuantity().negate());
            case "TRANSFER" -> {add(d,d.getSourceWarehouse(),d.getSourceLocation(),d.getQuantity().negate());add(d,d.getTargetWarehouse(),d.getTargetLocation(),d.getQuantity());}
            case "COUNT" -> count(d);
            default -> { }
        }
    }
    private void count(StockDocument d){
        String warehouse=d.getSourceWarehouse()!=null?d.getSourceWarehouse():d.getTargetWarehouse();
        String location=d.getSourceLocation()!=null?d.getSourceLocation():d.getTargetLocation();
        if(warehouse==null||location==null) throw new BusinessException(HttpStatus.BAD_REQUEST,"盘点过账需要指定仓库和库位");
        var balance=inventory.findByTenantIdAndWarehouseCodeAndLocationCodeAndSkuAndLotNo(TenantContext.require(),warehouse,location,d.getSku(),d.getLotNo())
                .orElseGet(()->new InventoryBalance(TenantContext.require(),warehouse,location,d.getSku(),d.getSkuName(),d.getLotNo(),BigDecimal.ZERO,d.getUom()));
        balance.setQuantity(d.getQuantity());
        if(balance.getId()==null) inventory.insert(balance); else inventory.updateById(balance);
    }
    private void add(StockDocument d,String wh,String location,BigDecimal amount){
        if(wh==null||location==null) throw new BusinessException(HttpStatus.BAD_REQUEST,"库存过账需要指定仓库和库位");
        var balance=inventory.findByTenantIdAndWarehouseCodeAndLocationCodeAndSkuAndLotNo(TenantContext.require(),wh,location,d.getSku(),d.getLotNo()).orElseGet(()->{
            if(amount.signum()<0) throw BusinessException.conflict("可用库存不足，无法过账");
            return new InventoryBalance(TenantContext.require(),wh,location,d.getSku(),d.getSkuName(),d.getLotNo(),BigDecimal.ZERO,d.getUom());
        });
        if(balance.getQuantity().add(amount).signum()<0) throw BusinessException.conflict("可用库存不足，无法过账");
        balance.add(amount);
        if(balance.getId()==null) inventory.insert(balance); else inventory.updateById(balance);
    }
    private void validateWarehouse(String code){if(code!=null&&warehouses.findByTenantIdAndCode(TenantContext.require(),code).isEmpty()) throw new BusinessException(HttpStatus.BAD_REQUEST,"仓库不存在："+code);}
    private void validateType(String type){if(!List.of("INBOUND","OUTBOUND","TRANSFER","COUNT","MIGO_IN","MIGO_OUT","GA_OUT","RETURN_IN","OTHER").contains(type))throw new BusinessException(HttpStatus.BAD_REQUEST,"不支持的单据类型");}
    private void requireStatus(StockDocument d,String status){if(!status.equals(d.getStatus()))throw BusinessException.conflict("当前单据状态不支持此操作");}
    public record CreateDocumentRequest(String docNo,@NotBlank String docType,String sourceWarehouse,String sourceLocation,String targetWarehouse,String targetLocation,String businessPartner,@NotBlank String sku,@NotBlank String skuName,String lotNo,@NotNull @DecimalMin("0.0000") BigDecimal quantity,@NotBlank String uom){}
}
