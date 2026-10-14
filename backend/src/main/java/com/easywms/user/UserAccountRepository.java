package com.easywms.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import java.util.Optional;
import java.util.List;

public interface UserAccountRepository extends BaseMapper<UserAccount> {
    default Optional<UserAccount> findByTenantIdAndUsername(Long tenantId, String username) {
        return Optional.ofNullable(selectOne(Wrappers.<UserAccount>lambdaQuery().eq(UserAccount::getTenantId, tenantId).eq(UserAccount::getUsername, username)));
    }
    default Optional<UserAccount> findByIdAndTenantId(Long id, Long tenantId) {
        return Optional.ofNullable(selectOne(Wrappers.<UserAccount>lambdaQuery().eq(UserAccount::getId, id).eq(UserAccount::getTenantId, tenantId)));
    }
    default List<UserAccount> findAllByTenantIdOrderByUsername(Long tenantId) {
        return selectList(Wrappers.<UserAccount>lambdaQuery().eq(UserAccount::getTenantId, tenantId).orderByAsc(UserAccount::getUsername));
    }
}
