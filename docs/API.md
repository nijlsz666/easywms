# EasyWMS REST API

Base URL：`http://localhost:8080/api/v1`。除登录和 OIDC 发起/回调外，接口使用 `Authorization: Bearer <accessToken>`。JSON 成功响应格式为 `{ "success": true, "data": ..., "timestamp": "..." }`。错误响应包含 `success: false` 和 `message`。

Swagger UI 的 OpenAPI schema 是完整参数定义的来源：`http://localhost:8080/docs`。

## 登录与身份

### 登录

`POST /auth/login`

```json
{ "tenantId": 1001, "username": "admin", "password": "admin123" }
```

响应 `data` 返回 `accessToken`、`tokenType`、`expiresIn` 和用户权限。默认 JWT 有效期 8 小时，可通过 `JWT_EXPIRATION_SECONDS` 修改。

### 当前用户与 SSO 状态

- `GET /auth/me`：读取当前 JWT 对应的用户。
- `GET /auth/sso/config`：读取 OIDC 是否启用。
- 启用 `sso` Profile 后，Web 与 PDA 分别访问 `/auth/sso/start?client=web`、`/auth/sso/start?client=pda` 开始 OIDC 登录；服务端只允许这两个配置过的回跳目标。

## 核心业务

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/dashboard` | `dashboard:read` | 看板指标与近期单据 |
| GET / POST | `/warehouses` | `warehouse:read` / `warehouse:write` | 仓库查询与创建 |
| GET | `/inventory?warehouse=RM-01&sku=MAT-10` | `inventory:read` | 按租户、数据范围筛选库存 |
| GET / POST | `/documents` | `document:read` / `document:create` | 单据查询与草稿创建 |
| POST | `/documents/{id}/actions` | 按操作校验 | 提交、审批、驳回、取消、库存过账 |
| GET | `/approvals/pending` | `approval:read` | 待审批单据 |
| GET / POST | `/quality/inspections` | `quality:read` / `quality:inspect` | 质检记录查询与登记 |
| POST | `/quality/inspections/{id}/decisions` | `quality:decide` | PASS、HOLD、REJECT 处置 |
| GET / POST | `/system/users` | `system:user:read` / `system:user:write` | 用户查询与创建 |
| PUT | `/system/users/{id}/access` | `system:user:write` | 更新角色、功能权限与仓库范围 |
| GET | `/system/roles` | `system:user:read` | 预置角色模板 |
| GET / PUT | `/system/configs`、`/system/configs/{key}` | `system:config:read` / `system:config:write` | 租户级 UI 配置 JSON |
| GET | `/integrations/health` | `integration:write` | 集成服务健康检查 |
| POST | `/integrations/erp/movements` | `integration:write` | ERP 物料移动同步，按 `externalDocNo` 幂等 |

## 创建仓储单据

`POST /documents`

```json
{
  "docType": "INBOUND",
  "targetWarehouse": "RM-01",
  "targetLocation": "A-01-01",
  "businessPartner": "宝钢供应链",
  "sku": "MAT-1001",
  "skuName": "冷轧钢板 1.2mm",
  "lotNo": "LOT-261013-01",
  "quantity": 520,
  "uom": "kg"
}
```

支持类型：`INBOUND`、`OUTBOUND`、`TRANSFER`、`COUNT`、`MIGO_IN`、`MIGO_OUT`、`GA_OUT`、`RETURN_IN`、`OTHER`。单据可选传入 `docNo`；省略时服务端生成编号。库存过账要求指定来源/目标仓库和库位。`COUNT` 单据的 `quantity` 表示实盘数量，过账时会将对应仓库、库位、物料和批次的账面余额校准为该数量。

状态操作：

```json
{ "action": "SUBMIT" }
```

`DRAFT → PENDING_APPROVAL → APPROVED → COMPLETED`。待审批单可 `APPROVE` 或 `REJECT`；草稿可 `CANCEL`。`COMPLETE` 执行库存过账。权限按操作分别校验 `document:submit`、`approval:decide` 和 `document:post`。

## ERP 物料移动接口

`POST /integrations/erp/movements`

```json
{
  "externalDocNo": "ERP-50001234",
  "movementType": "GOODS_RECEIPT",
  "targetWarehouse": "RM-01",
  "targetLocation": "A-01-01",
  "businessPartner": "供应商 10001",
  "sku": "MAT-1001",
  "skuName": "冷轧钢板 1.2mm",
  "lotNo": "LOT-ERP-50001234",
  "quantity": 500,
  "uom": "kg"
}
```

`movementType` 支持 `GOODS_RECEIPT`、`GOODS_ISSUE`、`TRANSFER`。同租户重复提交同一 `externalDocNo` 时返回已存在单据，不重复创建。ERP 服务账号需授予 `integration:write` 和相关仓库数据范围。

## 数据范围

用户的 `warehouseScope` 为 `ALL` 或逗号分隔仓库编码，例如 `RM-01,LINE-01`。登录签发的 JWT 携带租户、权限码和仓库范围；控制器和业务服务均按 JWT 租户隔离。不要从请求体或 `X-Tenant-Id` 请求头信任租户身份。
