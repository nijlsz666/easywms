package com.easywms.document;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.util.List;
import java.util.Optional;

public interface StockDocumentRepository extends BaseMapper<StockDocument> {
    default List<StockDocument> findAllByTenantIdOrderByCreatedAtDesc(Long tenantId) {
        return selectList(Wrappers.<StockDocument>lambdaQuery().eq(StockDocument::getTenantId, tenantId).orderByDesc(StockDocument::getCreatedAt));
    }
    default Optional<StockDocument> findByTenantIdAndId(Long tenantId, Long id) {
        return Optional.ofNullable(selectOne(Wrappers.<StockDocument>lambdaQuery().eq(StockDocument::getTenantId, tenantId).eq(StockDocument::getId, id)));
    }
    default Optional<StockDocument> findByTenantIdAndDocNo(Long tenantId, String docNo) {
        return Optional.ofNullable(selectOne(Wrappers.<StockDocument>lambdaQuery().eq(StockDocument::getTenantId, tenantId).eq(StockDocument::getDocNo, docNo)));
    }
    default boolean existsByTenantIdAndDocNo(Long tenantId, String docNo) {
        return selectCount(Wrappers.<StockDocument>lambdaQuery().eq(StockDocument::getTenantId, tenantId).eq(StockDocument::getDocNo, docNo)) > 0;
    }
}
