package com.easywms.warehouse;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.util.List;
import java.util.Optional;

public interface WarehouseRepository extends BaseMapper<Warehouse> {
    default List<Warehouse> findAllByTenantIdOrderByCode(Long tenantId) {
        return selectList(Wrappers.<Warehouse>lambdaQuery().eq(Warehouse::getTenantId, tenantId).orderByAsc(Warehouse::getCode));
    }
    default Optional<Warehouse> findByTenantIdAndCode(Long tenantId, String code) {
        return Optional.ofNullable(selectOne(Wrappers.<Warehouse>lambdaQuery().eq(Warehouse::getTenantId, tenantId).eq(Warehouse::getCode, code)));
    }
}
