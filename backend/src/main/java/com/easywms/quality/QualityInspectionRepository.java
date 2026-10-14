package com.easywms.quality;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.util.List;
import java.util.Optional;

public interface QualityInspectionRepository extends BaseMapper<QualityInspection> {
    default List<QualityInspection> findAllByTenantIdOrderByCreatedAtDesc(Long tenantId) {
        return selectList(Wrappers.<QualityInspection>lambdaQuery().eq(QualityInspection::getTenantId, tenantId).orderByDesc(QualityInspection::getCreatedAt));
    }
    default Optional<QualityInspection> findByTenantIdAndId(Long tenantId, Long id) {
        return Optional.ofNullable(selectOne(Wrappers.<QualityInspection>lambdaQuery().eq(QualityInspection::getTenantId, tenantId).eq(QualityInspection::getId, id)));
    }
    default Optional<QualityInspection> findByTenantIdAndInspectionNo(Long tenantId, String inspectionNo) {
        return Optional.ofNullable(selectOne(Wrappers.<QualityInspection>lambdaQuery().eq(QualityInspection::getTenantId, tenantId).eq(QualityInspection::getInspectionNo, inspectionNo)));
    }
}
