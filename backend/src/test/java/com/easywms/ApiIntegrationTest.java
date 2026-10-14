package com.easywms;

import com.easywms.user.TenantEntity;
import com.easywms.user.TenantRepository;
import com.easywms.user.UserAccount;
import com.easywms.user.UserAccountRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {
    private static final long DEMO_TENANT = 1001L;
    private static final long OTHER_TENANT = 2002L;
    private static final String PASSWORD = "test-password";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserAccountRepository users;
    @Autowired TenantRepository tenants;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    void createTestPrincipals() {
        if (tenants.selectById(OTHER_TENANT) == null) tenants.insert(new TenantEntity(OTHER_TENANT, "TEST-OTHER", "隔离测试租户"));
        addUserIfMissing(DEMO_TENANT, "scope_operator", "inventory:read,warehouse:read", "RM-01");
        addUserIfMissing(DEMO_TENANT, "quality_operator", "quality:read,quality:inspect,warehouse:read", "QA-01");
        addUserIfMissing(OTHER_TENANT, "other_admin", "inventory:read,document:read,warehouse:read,quality:read,system:config:read", "ALL");
    }

    @Test
    void loginRejectsBadCredentialsAndProtectedRoutesRequireAuthentication() throws Exception {
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("tenantId", DEMO_TENANT, "username", "admin", "password", "wrong"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/inventory")).andExpect(status().isUnauthorized());

        String token = login(DEMO_TENANT, "admin", "admin123");
        JsonNode currentUser = data(mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertEquals("admin", currentUser.path("username").asText());
        assertEquals(DEMO_TENANT, currentUser.path("tenantId").asLong());
    }

    @Test
    void warehouseScopeFiltersListsAndRejectsOutOfScopeQueries() throws Exception {
        String token = login(DEMO_TENANT, "scope_operator", PASSWORD);
        JsonNode inventory = data(mvc.perform(get("/api/v1/inventory").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertTrue(inventory.size() > 0);
        for (JsonNode row : inventory) assertEquals("RM-01", row.path("warehouseCode").asText());

        mvc.perform(get("/api/v1/inventory").param("warehouse", "FG-01").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
        JsonNode warehouses = data(mvc.perform(get("/api/v1/warehouses").header("Authorization", bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertTrue(warehouses.size() > 0);
        for (JsonNode row : warehouses) assertEquals("RM-01", row.path("code").asText());
    }

    @Test
    void inboundDocumentMustFollowApprovalBeforePostingAndUpdatesInventory() throws Exception {
        String token = login(DEMO_TENANT, "admin", "admin123");
        String sku = "IT-" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode created = data(mvc.perform(post("/api/v1/documents").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of(
                                "docType", "INBOUND", "targetWarehouse", "RM-01", "targetLocation", "TEST-01",
                                "sku", sku, "skuName", "集成测试物料", "lotNo", "LOT-TEST", "quantity", 4.5, "uom", "pcs"))))
                .andExpect(status().isOk()).andReturn());
        long id = created.path("id").asLong();
        assertEquals("DRAFT", created.path("status").asText());
        assertEquals("PENDING_APPROVAL", action(token, id, "SUBMIT").path("status").asText());
        assertEquals("APPROVED", action(token, id, "APPROVE").path("status").asText());
        assertEquals("COMPLETED", action(token, id, "COMPLETE").path("status").asText());

        JsonNode rows = data(mvc.perform(get("/api/v1/inventory").param("warehouse", "RM-01").param("sku", sku)
                        .header("Authorization", bearer(token))).andExpect(status().isOk()).andReturn());
        assertEquals(1, rows.size());
        assertEquals(4.5, rows.get(0).path("quantity").asDouble());

        mvc.perform(post("/api/v1/documents").header("Authorization", bearer(token)).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("docType", "OUTBOUND", "sourceWarehouse", "RM-01", "sourceLocation", "A-01-01",
                                "sku", sku, "skuName", "集成测试物料", "lotNo", "LOT-TEST", "quantity", 0, "uom", "pcs"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void zeroQuantityCycleCountCanPostAndCreateZeroBalance() throws Exception {
        String token = login(DEMO_TENANT, "admin", "admin123");
        String sku = "COUNT-" + UUID.randomUUID().toString().substring(0, 8);
        JsonNode created = data(mvc.perform(post("/api/v1/documents").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of(
                                "docType", "COUNT", "sourceWarehouse", "RM-01", "sourceLocation", "ZERO-01",
                                "sku", sku, "skuName", "空库位盘点物料", "lotNo", "LOT-ZERO", "quantity", 0, "uom", "pcs"))))
                .andExpect(status().isOk()).andReturn());
        long id = created.path("id").asLong();
        action(token, id, "SUBMIT"); action(token, id, "APPROVE");
        assertEquals("COMPLETED", action(token, id, "COMPLETE").path("status").asText());
        JsonNode rows = data(mvc.perform(get("/api/v1/inventory").param("warehouse", "RM-01").param("sku", sku)
                        .header("Authorization", bearer(token))).andExpect(status().isOk()).andReturn());
        assertEquals(1, rows.size());
        assertEquals(0.0, rows.get(0).path("quantity").asDouble());
    }

    @Test
    void qualityInspectionRequiresDecisionPermissionAndTenantDataStaysIsolated() throws Exception {
        String qualityToken = login(DEMO_TENANT, "quality_operator", PASSWORD);
        JsonNode inspection = data(mvc.perform(post("/api/v1/quality/inspections").header("Authorization", bearer(qualityToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of(
                                "inspectionType", "来料检验", "warehouseCode", "QA-01", "sku", "QC-ACCESS-01",
                                "skuName", "权限测试物料", "lotNo", "LOT-QC-01", "inspectedQty", 2.0))))
                .andExpect(status().isOk()).andReturn());
        mvc.perform(post("/api/v1/quality/inspections/" + inspection.path("id").asLong() + "/decisions")
                        .header("Authorization", bearer(qualityToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("result", "PASS"))))
                .andExpect(status().isForbidden());

        String adminToken = login(DEMO_TENANT, "admin", "admin123");
        JsonNode adminInspection = data(mvc.perform(post("/api/v1/quality/inspections").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of(
                                "inspectionType", "来料检验", "warehouseCode", "QA-01", "sku", "QC-PASS-01",
                                "skuName", "质检放行测试", "lotNo", "LOT-QC-PASS", "inspectedQty", 3.0))))
                .andExpect(status().isOk()).andReturn());
        JsonNode decided = data(mvc.perform(post("/api/v1/quality/inspections/" + adminInspection.path("id").asLong() + "/decisions")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("result", "PASS"))))
                .andExpect(status().isOk()).andReturn());
        assertEquals("PASS", decided.path("status").asText());
        mvc.perform(post("/api/v1/quality/inspections/" + adminInspection.path("id").asLong() + "/decisions")
                        .header("Authorization", bearer(adminToken)).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("result", "REJECT"))))
                .andExpect(status().isConflict());

        String otherToken = login(OTHER_TENANT, "other_admin", PASSWORD);
        assertEquals(0, data(mvc.perform(get("/api/v1/inventory").header("Authorization", bearer(otherToken)))
                .andExpect(status().isOk()).andReturn()).size());
        assertEquals(0, data(mvc.perform(get("/api/v1/documents").header("Authorization", bearer(otherToken)))
                .andExpect(status().isOk()).andReturn()).size());
        assertEquals(0, data(mvc.perform(get("/api/v1/quality/inspections").header("Authorization", bearer(otherToken)))
                .andExpect(status().isOk()).andReturn()).size());

        mvc.perform(put("/api/v1/system/configs/forms.integration-test").header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("type", "FORM", "value", "{\"fields\":[\"sku\"]}"))))
                .andExpect(status().isOk());
        JsonNode otherConfigs = data(mvc.perform(get("/api/v1/system/configs").header("Authorization", bearer(otherToken)))
                .andExpect(status().isOk()).andReturn());
        boolean leaked = false;
        for (JsonNode row : otherConfigs) leaked |= "forms.integration-test".equals(row.path("configKey").asText());
        assertFalse(leaked);
    }

    private JsonNode action(String token, long id, String action) throws Exception {
        return data(mvc.perform(post("/api/v1/documents/" + id + "/actions").header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("action", action))))
                .andExpect(status().isOk()).andReturn());
    }

    private String login(long tenantId, String username, String password) throws Exception {
        JsonNode data = data(mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("tenantId", tenantId, "username", username, "password", password))))
                .andExpect(status().isOk()).andReturn());
        return data.path("accessToken").asText();
    }

    private JsonNode data(MvcResult result) throws Exception { return objectMapper.readTree(result.getResponse().getContentAsString()).path("data"); }
    private String bearer(String token) { return "Bearer " + token; }
    private String json(Object value) throws Exception { return objectMapper.writeValueAsString(value); }
    private void addUserIfMissing(long tenantId, String username, String permissions, String warehouseScope) {
        if (users.findByTenantIdAndUsername(tenantId, username).isEmpty()) {
            users.insert(new UserAccount(tenantId, username, passwordEncoder.encode(PASSWORD), username, "test_role", permissions, warehouseScope));
        }
    }
}
