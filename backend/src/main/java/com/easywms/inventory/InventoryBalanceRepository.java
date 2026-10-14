package com.easywms.inventory;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.util.List;
import java.util.Optional;

public interface InventoryBalanceRepository extends BaseMapper<InventoryBalance> {
    default List<InventoryBalance> findAllByTenantIdOrderByUpdatedAtDesc(Long tenantId) {
        return selectList(Wrappers.<InventoryBalance>lambdaQuery().eq(InventoryBalance::getTenantId, tenantId).orderByDesc(InventoryBalance::getUpdatedAt));
    }
    default Optional<InventoryBalance> findByTenantIdAndWarehouseCodeAndLocationCodeAndSkuAndLotNo(Long tenantId, String warehouseCode, String locationCode, String sku, String lotNo) {
        return Optional.ofNullable(selectOne(Wrappers.<InventoryBalance>lambdaQuery().eq(InventoryBalance::getTenantId, tenantId).eq(InventoryBalance::getWarehouseCode, warehouseCode).eq(InventoryBalance::getLocationCode, locationCode).eq(InventoryBalance::getSku, sku).eq(InventoryBalance::getLotNo, lotNo)));
    }
    default List<InventoryBalance> findAllByTenantIdAndWarehouseCode(Long tenantId, String warehouseCode) {
        return selectList(Wrappers.<InventoryBalance>lambdaQuery().eq(InventoryBalance::getTenantId, tenantId).eq(InventoryBalance::getWarehouseCode, warehouseCode));
    }
    default List<InventoryBalance> findAllByTenantIdAndWarehouseCodeAndSkuAndLotNo(Long tenantId, String warehouseCode, String sku, String lotNo) {
        return selectList(Wrappers.<InventoryBalance>lambdaQuery().eq(InventoryBalance::getTenantId, tenantId).eq(InventoryBalance::getWarehouseCode, warehouseCode).eq(InventoryBalance::getSku, sku).eq(InventoryBalance::getLotNo, lotNo));
    }
}
