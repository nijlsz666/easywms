CREATE TABLE IF NOT EXISTS sys_tenant (
  id BIGINT NOT NULL PRIMARY KEY,
  tenant_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_user (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  permission_codes VARCHAR(4000) NOT NULL,
  warehouse_scope VARCHAR(1000),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uk_sys_user_tenant_username (tenant_id, username),
  KEY idx_sys_user_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wms_warehouse (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  warehouse_code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(40) NOT NULL,
  address VARCHAR(255),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uk_wms_warehouse_tenant_code (tenant_id, warehouse_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wms_inventory_balance (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  warehouse_code VARCHAR(40) NOT NULL,
  location_code VARCHAR(60) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  sku_name VARCHAR(160) NOT NULL,
  lot_no VARCHAR(80) NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  quality_status VARCHAR(20) NOT NULL DEFAULT '合格',
  updated_at TIMESTAMP(6) NOT NULL,
  UNIQUE KEY uk_wms_balance_position (tenant_id, warehouse_code, location_code, sku, lot_no),
  KEY idx_wms_balance_tenant_updated (tenant_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wms_stock_document (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  doc_no VARCHAR(40) NOT NULL,
  doc_type VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  source_warehouse VARCHAR(40),
  target_warehouse VARCHAR(40),
  source_location VARCHAR(60),
  target_location VARCHAR(60),
  business_partner VARCHAR(160),
  sku VARCHAR(80) NOT NULL,
  sku_name VARCHAR(160) NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL,
  updated_at TIMESTAMP(6) NOT NULL,
  lot_no VARCHAR(80) NOT NULL,
  UNIQUE KEY uk_wms_document_tenant_no (tenant_id, doc_no),
  KEY idx_wms_document_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wms_quality_inspection (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  inspection_no VARCHAR(50) NOT NULL,
  source_doc_no VARCHAR(50),
  inspection_type VARCHAR(40) NOT NULL,
  warehouse_code VARCHAR(40) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  sku_name VARCHAR(160) NOT NULL,
  lot_no VARCHAR(80) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  inspected_qty DECIMAL(18,4) NOT NULL,
  accepted_qty DECIMAL(18,4),
  rejected_qty DECIMAL(18,4),
  inspector VARCHAR(64),
  remark VARCHAR(800),
  created_at TIMESTAMP(6) NOT NULL,
  decided_at TIMESTAMP(6),
  UNIQUE KEY uk_wms_inspection_tenant_no (tenant_id, inspection_no),
  KEY idx_wms_inspection_tenant_created (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sys_ui_config (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  config_key VARCHAR(120) NOT NULL,
  config_type VARCHAR(32) NOT NULL,
  config_value MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP(6) NOT NULL,
  UNIQUE KEY uk_sys_config_tenant_key (tenant_id, config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
