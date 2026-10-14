package com.easywms.config;

import com.easywms.document.StockDocument;
import com.easywms.document.StockDocumentRepository;
import com.easywms.inventory.InventoryBalance;
import com.easywms.inventory.InventoryBalanceRepository;
import com.easywms.quality.QualityInspection;
import com.easywms.quality.QualityInspectionRepository;
import com.easywms.user.*;
import com.easywms.warehouse.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.util.List;

@Configuration
public class DemoDataInitializer {
    @Bean CommandLineRunner seedDemoData(TenantRepository tenants,UserAccountRepository users,WarehouseRepository warehouses,InventoryBalanceRepository inventory,StockDocumentRepository documents,QualityInspectionRepository inspections,PasswordEncoder encoder){
        return args->{
            long tenantId=1001L;
            if(tenants.selectById(tenantId)==null)tenants.insert(new TenantEntity(tenantId,"DEMO","华东制造集团"));
            String permissions=String.join(",",List.of("dashboard:read","warehouse:read","warehouse:write","inventory:read","document:read","document:create","document:submit","document:post","approval:read","approval:decide","quality:read","quality:inspect","quality:decide","integration:write","system:user:read","system:user:write","system:config:read","system:config:write"));
            if(users.findByTenantIdAndUsername(tenantId,"admin").isEmpty())users.insert(new UserAccount(tenantId,"admin",encoder.encode("admin123"),"系统管理员","tenant_admin",permissions,"ALL"));
            List<Warehouse> seeds=List.of(new Warehouse(tenantId,"RM-01","原材料中心仓","原材料仓","上海市浦东新区"),new Warehouse(tenantId,"FG-01","成品总仓","成品仓","上海市浦东新区"),new Warehouse(tenantId,"LINE-01","一号线边仓","线边仓","上海市浦东新区制造一部"),new Warehouse(tenantId,"QA-01","待检与不合格品区","质量仓","上海市浦东新区"));
            for(Warehouse w:seeds)if(warehouses.findByTenantIdAndCode(tenantId,w.getCode()).isEmpty())warehouses.insert(w);
            seedBalance(inventory,tenantId,"RM-01","A-01-01","MAT-1001","冷轧钢板 1.2mm","LOT-260930-01","2400","kg");
            seedBalance(inventory,tenantId,"RM-01","A-01-02","MAT-1002","铝型材 6061-T6","LOT-261001-03","860","kg");
            seedBalance(inventory,tenantId,"FG-01","F-02-01","FG-2001","智能控制器 V3","LOT-261010-02","320","pcs");
            seedBalance(inventory,tenantId,"LINE-01","L-01-01","MAT-1001","冷轧钢板 1.2mm","LOT-260930-01","180","kg");
            seedBalance(inventory,tenantId,"QA-01","Q-01-01","MAT-1014","轴承 6204-ZZ","LOT-261013-05","64","pcs");
            seedBalance(inventory,tenantId,"FG-01","F-01-03","FG-2004","智能传感器 S2","LOT-261009-08","96","pcs");
            if(inspections.findAllByTenantIdOrderByCreatedAtDesc(tenantId).isEmpty())inspections.insert(new QualityInspection(tenantId,"IQC-20261013-0034","ASN-20261013-0081","来料检验","QA-01","MAT-1014","轴承 6204-ZZ","LOT-261013-05",new BigDecimal("64"),"admin","演示来料抽检记录"));
            if(documents.findAllByTenantIdOrderByCreatedAtDesc(tenantId).isEmpty()){
                var a=new StockDocument(tenantId,"ASN-20261013-0081","INBOUND",null,"RM-01",null,"A-01-01","宝钢供应链","MAT-1001","冷轧钢板 1.2mm","LOT-261013-01",new BigDecimal("520"),"kg","admin");a.setStatus("PENDING_APPROVAL");documents.insert(a);
                var b=new StockDocument(tenantId,"MO-20261013-0154","MIGO_OUT","RM-01","LINE-01","A-01-02","L-01-02","制造一部","MAT-1002","铝型材 6061-T6","LOT-261001-03",new BigDecimal("48"),"kg","admin");b.setStatus("APPROVED");documents.insert(b);
                var c=new StockDocument(tenantId,"DO-20261012-0039","OUTBOUND","FG-01",null,"F-02-01",null,"华东销售部","FG-2001","智能控制器 V3","LOT-261010-02",new BigDecimal("36"),"pcs","admin");c.setStatus("COMPLETED");documents.insert(c);
            }
        };
    }
    private void seedBalance(InventoryBalanceRepository repo,long tenant,String warehouse,String location,String sku,String name,String lot,String qty,String uom){
        if(repo.findByTenantIdAndWarehouseCodeAndLocationCodeAndSkuAndLotNo(tenant,warehouse,location,sku,lot).isEmpty())repo.insert(new InventoryBalance(tenant,warehouse,location,sku,name,lot,new BigDecimal(qty),uom));
    }
}
