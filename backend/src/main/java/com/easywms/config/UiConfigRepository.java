package com.easywms.config;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.util.List;
import java.util.Optional;

public interface UiConfigRepository extends BaseMapper<UiConfigEntity> {
    default List<UiConfigEntity> findAllByTenantIdOrderByConfigKey(Long tenantId) {
        return selectList(Wrappers.<UiConfigEntity>lambdaQuery().eq(UiConfigEntity::getTenantId, tenantId).orderByAsc(UiConfigEntity::getConfigKey));
    }
    default Optional<UiConfigEntity> findByTenantIdAndConfigKey(Long tenantId, String configKey) {
        return Optional.ofNullable(selectOne(Wrappers.<UiConfigEntity>lambdaQuery().eq(UiConfigEntity::getTenantId, tenantId).eq(UiConfigEntity::getConfigKey, configKey)));
    }
}
