package com.easywms.security;

public final class TenantContext {
    private static final ThreadLocal<Long> TENANT_ID = new ThreadLocal<>();
    private TenantContext() { }
    public static void set(Long id) { TENANT_ID.set(id); }
    public static Long get() { return TENANT_ID.get(); }
    public static Long require() {
        Long id = get();
        if (id == null) throw new IllegalStateException("当前请求未绑定租户");
        return id;
    }
    public static void clear() { TENANT_ID.remove(); }
}
