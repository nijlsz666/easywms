# EasyWMS 制造业仓储管理系统

EasyWMS 是一个面向制造业和多仓协同场景的 WMS 起步项目，包含 Java 服务端、独立 React Web 管理端、跨平台 React H5 PDA 端、MySQL 数据模型和 OpenAPI 文档。Web 和 PDA 可以分别安装、构建和部署。

## 技术栈

- 服务端：Java 21、Spring Boot 3.4、Spring Security、MyBatis-Plus、JWT、OAuth 2.0 / OIDC 客户端
- Web 管理端：React 19、TypeScript、Vite、Lucide 图标
- PDA 作业端：React 19、TypeScript、Vite、PWA manifest，支持浏览器和 PDA WebView
- 数据库：MySQL 8.x
- 接口：REST JSON、OpenAPI 3、Swagger UI

## 已落地功能

### 仓储业务

- WMS 运营看板：库存 SKU 与数量、待审批、开放单据、仓库利用率、近期单据和快捷入口。
- 线边仓、原材料仓、成品仓和质量仓：库存按仓库、库位、物料、批次、质量状态查询。
- 收货、发货、调拨、盘点、其他作业、MIGO、GA 单据列表；支持新建草稿、提交审批、审批、驳回、取消和库存过账。
- 入库、出库、调拨与盘点单在过账时更新库存余额；盘点以实盘数量校准账面数，出库会校验可用数量，库存不足时拒绝过账。
- 质量检验登记及 PASS / HOLD / REJECT 处置接口；处置结果会更新匹配库存批次的质量状态。
- 近期作业记录、列表搜索、状态筛选、列显隐配置、CSV 导出和记录详情。

### 平台与集成

- 多租户：用户、仓库、库存、业务单据、检验记录和 UI 配置均按 `tenant_id` 隔离。
- 用户登录：租户 ID + 用户名 + BCrypt 密码校验，签发 JWT；接口按权限码鉴权。
- 企业单点登录：可选 OIDC 授权码流程；按租户预先配置的用户名映射身份，再换发 WMS JWT。
- 功能权限与数据范围：账号保存权限码和仓库范围（`ALL` 或逗号分隔的仓库编码），库存、仓库和单据列表及单据操作均执行范围过滤。
- 预置角色模板：租户管理员、仓库主管、仓库作业员、质检员；用户权限可单独配置。
- 动态配置存储接口：按租户保存 JSON 表格、表单、菜单或其他 UI 配置；前端提供列配置和表单设计预览。
- ERP 对接：服务账号可通过幂等的 ERP 物料移动接口同步收货、发料和调拨单；使用租户 JWT 与接口权限。
- OpenAPI / Swagger 文档、统一 JSON 响应、参数校验、业务错误响应和可配置 CORS。

### 跨平台 PDA H5

- PDA 是独立前端项目，可使用独立域名或 Web 根路径；支持手机、平板、桌面浏览器和 PDA WebView，也可安装为主屏幕应用。
- 参照 `workspace/code/srm/upgrade-pda` 的现场作业菜单与扫码节奏，提供采购收货、生产领料、成品入库、销售拣配、库存管理、报废、客供料、盘点巡检等模块。
- 支持键盘模拟扫描（PDA 内置扫描头 / USB 扫描枪）、浏览器相机扫码（设备和浏览器支持时）、手动输入；扫描后可编辑物料、批次、数量与库位。
- PDA 复用 WMS 登录、租户、权限与 REST API；收货、出库、调拨、盘点和质检作业按权限提交，任务队列可继续审批与过账。
- 详细的设备兼容、业务映射和当前边界见 [docs/PDA.md](docs/PDA.md)。

## 仓库功能对应

| 截图中的入口 | EasyWMS 功能 |
| --- | --- |
| 线边仓管理 | 线边仓库存查询、线边配送/退料调拨单 |
| 仓储单据管理 | 收货、出库、调拨、盘点及审批状态流转 |
| 原材料仓储管理 | 原材料库存、库位、批次及质量状态 |
| 成品仓储管理 | 成品库存和销售出库业务 |
| 盘点管理 | 盘点任务单与审批流程基础 |
| 其他 | 其他收发、退货等单据类型 |
| MIGO 管理 | ERP 物料凭证收货/发料映射 |
| GA 类管理 | 一般费用领用出库 |
| WMS-dashboard | WMS 运营看板 |

## 本地启动

### 1. 准备 MySQL

启动 MySQL 8，并创建数据库：

```sql
CREATE DATABASE easywms CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

MyBatis-Plus 不会自动创建业务表。首次部署时先执行 `backend/src/main/resources/db/schema-mysql.sql` 创建表结构，再启动服务。连接配置使用环境变量 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD`；默认连接 `localhost:3306/easywms`，开发用户名和密码为 `root` / `root`。

### 2. 启动服务端

需要 JDK 21 和 Maven 3.9+：

```bash
cd backend
mvn spring-boot:run
```

默认地址为 `http://localhost:8080`。服务首次启动会初始化演示租户 `1001`、仓库、库存、样例单据和用户。

### 3. 启动 Web 管理端

需要 Node.js 20+：

```bash
cd frontend-web
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。如服务端部署在其他地址，可复制 `.env.example` 为 `.env`，并设置 `VITE_API_BASE_URL`，例如 `https://wms-api.example.com/api/v1`。

### 4. 启动 PDA H5

```bash
cd frontend-pda
npm install
npm run dev
```

浏览器打开 `http://localhost:5174`。Web 管理端和 PDA 端通过各自的 `.env` 独立配置 API 地址；生产部署时可分配不同域名，或将 PDA 的构建产物部署到 `/pda/` 子路径。部署到 HTTPS 域名后，可从 Android PDA 或手机浏览器添加到主屏幕。不同设备使用键盘模拟扫描、支持的浏览器相机扫码或手动输入。

### 演示账号

- 租户 ID：`1001`
- 用户名：`admin`
- 密码：`admin123`

当本地 API 未启动时，以上账号可进入纯前端离线演示模式；连接 API 后会使用服务端 BCrypt 登录和真实 JWT。首次部署后请立即替换演示密码、JWT 密钥和数据库凭据。

## 自动化验证

后端集成测试使用隔离的 H2 内存数据库，不需要启动 MySQL；覆盖登录鉴权、仓库数据范围、租户隔离、收货审批与库存过账、零数量盘点、质检处置权限和租户配置。

```bash
cd backend
mvn test

cd ../frontend-web
npm ci
npm run build

cd ../frontend-pda
npm ci
npm run build
```

## 单点登录配置

OIDC 默认关闭。企业身份提供方的 `preferred_username`（或 `email`）需要与该租户已开通的 WMS 用户名一致。将以下回调地址登记到身份提供方：

```text
http://<wms-api-host>/login/oauth2/code/corporate
```

用环境变量启动 `sso` Profile：

```bash
cd backend
SPRING_PROFILES_ACTIVE=sso \
SSO_ISSUER_URI=https://id.example.com/realms/manufacturing \
SSO_CLIENT_ID=easywms \
SSO_CLIENT_SECRET='<secret>' \
SSO_TENANT_ID=1001 \
SSO_WEB_FRONTEND_URL=http://localhost:5173 \
SSO_PDA_FRONTEND_URL=http://localhost:5174 \
mvn spring-boot:run
```

Web 和 PDA 的“企业单点登录”分别使用配置好的回跳地址；服务端只接受 `web` 或 `pda` 客户端标识，不接收任意回跳 URL。登录成功后由服务端换发 WMS JWT。生产环境应使用 HTTPS，并配置实际的前端域名。

## API 文档

- Swagger UI：`http://localhost:8080/docs`
- OpenAPI JSON：`http://localhost:8080/openapi.json`
- 本仓库接口速查：[docs/API.md](docs/API.md)

## 目录结构

```text
backend/       Spring Boot API、MyBatis-Plus 映射、安全配置、服务端初始化数据
frontend-web/  独立 React + TypeScript Web 管理端
frontend-pda/  独立 React + TypeScript 跨平台 PDA H5
docs/API.md    REST 接口说明与请求示例
docs/PDA.md    PDA H5 功能映射、扫码说明与部署边界
```

## 生产化实施建议

当前仓库是可运行的业务起点和交互原型，适合继续按企业流程深化。生产上线前建议优先完成：数据库版本迁移（替换开发用 `ddl-auto=update`）、刷新令牌与强密钥托管、组织/角色审批矩阵、单据多明细行和库存流水账、并发扣减锁、PDA 扫码与离线任务、上架/补货/波次拣选/复核/装箱/发运、序列号与效期 FEFO、循环盘点差异复核、ERP/MES/TMS 消息重试与死信监控、审计报表及自动化验收。

库存台账是按物料、仓库、库位和批次汇总的余额表；当前示例单据每张包含一个物料行。实际部署需要根据企业组织、计量单位、批次策略、质量规则和 ERP 过账协议扩展单据行、流水账、审批配置和接口映射。
