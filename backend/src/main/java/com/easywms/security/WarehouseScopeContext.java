package com.easywms.security;

import java.util.Set;
import java.util.Arrays;
import java.util.stream.Collectors;

public final class WarehouseScopeContext {
    private static final ThreadLocal<String> SCOPE = new ThreadLocal<>();
    private WarehouseScopeContext() { }
    public static void set(String scope) { SCOPE.set(scope); }
    public static void clear() { SCOPE.remove(); }
    public static boolean allows(String warehouseCode) {
        String scope = SCOPE.get();
        if (scope == null || scope.isBlank() || "ALL".equals(scope)) return true;
        return Arrays.stream(scope.split(",")).map(String::trim).anyMatch(warehouseCode::equals);
    }
    public static Set<String> allowedCodes() {
        String scope = SCOPE.get();
        return scope == null || scope.isBlank() || "ALL".equals(scope) ? Set.of() : Arrays.stream(scope.split(",")).map(String::trim).filter(s->!s.isBlank()).collect(Collectors.toSet());
    }
}
