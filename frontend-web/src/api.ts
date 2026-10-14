export type ApiUser = { id: number; tenantId: number; username: string; displayName: string; role: string; permissions: string[] }
export type StockDocument = {
  id?: number; docNo: string; docType: string; status: string; sourceWarehouse?: string; targetWarehouse?: string
  sourceLocation?: string; targetLocation?: string; businessPartner?: string; sku: string; skuName: string; lotNo?: string
  quantity: number; uom: string; createdBy?: string; createdAt: string
}
export type InventoryItem = {
  id?: number; warehouseCode: string; locationCode: string; sku: string; skuName: string; lotNo: string
  quantity: number; uom: string; qualityStatus: string; updatedAt: string
}
export type WarehouseItem = { id?: number; code: string; name: string; type: string; address?: string; enabled?: boolean }
export type QualityInspection = { id?: number; inspectionNo: string; sourceDocNo?: string; inspectionType: string; warehouseCode: string; sku: string; skuName: string; lotNo: string; status: string; inspectedQty: number; acceptedQty?: number; rejectedQty?: number; inspector?: string; remark?: string; createdAt: string }
export type DashboardData = { skuCount: number; inventoryLines: number; inventoryByUom?: Record<string,number>; pendingApprovals: number; openDocuments: number; recentDocuments: StockDocument[] }
export type Session = { accessToken: string; user: ApiUser; offline: boolean }

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    })
  } catch {
    throw new Error('无法连接到 WMS 服务，请检查后端地址')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.success === false) throw new Error(body.message || `请求失败 (${response.status})`)
  return body.data as T
}

export async function signIn(tenantId: string, username: string, password: string): Promise<Session> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: Number(tenantId), username, password }),
    })
  } catch {
    if (tenantId === '1001' && username === 'admin' && password === 'admin123') {
      return { accessToken: 'local-demo-session', offline: true, user: { id: 1, tenantId: 1001, username: 'admin', displayName: '系统管理员', role: 'tenant_admin', permissions: ['*'] } }
    }
    throw new Error('无法连接到 WMS 服务；离线体验账号为 admin / admin123')
  }
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body.success === false) throw new Error(body.message || '登录失败，请检查租户和账号信息')
  return { ...body.data, offline: false }
}

export const api = {
  currentUser: (token: string) => request<ApiUser>('/auth/me', token),
  ssoConfig: async () => {
    const response = await fetch(`${baseUrl}/auth/sso/config`)
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.success === false) throw new Error(body.message || '无法读取单点登录配置')
    return body.data as { enabled: boolean; protocol: string }
  },
  dashboard: (token: string) => request<DashboardData>('/dashboard', token),
  documents: (token: string) => request<StockDocument[]>('/documents', token),
  inventory: (token: string) => request<InventoryItem[]>('/inventory', token),
  quality: (token: string) => request<QualityInspection[]>('/quality/inspections', token),
  warehouses: (token: string) => request<WarehouseItem[]>('/warehouses', token),
  createDocument: (token: string, data: object) => request<StockDocument>('/documents', token, { method: 'POST', body: JSON.stringify(data) }),
  createQuality: (token: string, data: object) => request<QualityInspection>('/quality/inspections', token, { method: 'POST', body: JSON.stringify(data) }),
  decideQuality: (token: string, id: number, result: string) => request<QualityInspection>(`/quality/inspections/${id}/decisions`, token, { method: 'POST', body: JSON.stringify({ result }) }),
  documentAction: (token: string, id: number, action: string) => request<StockDocument>(`/documents/${id}/actions`, token, { method: 'POST', body: JSON.stringify({ action }) }),
  users: (token: string) => request<any[]>('/system/users', token),
  createUser: (token: string, data: object) => request<any>('/system/users', token, { method: 'POST', body: JSON.stringify(data) }),
  updateUserAccess: (token: string, id: number, data: object) => request<any>(`/system/users/${id}/access`, token, { method: 'PUT', body: JSON.stringify(data) }),
  roles: (token: string) => request<any[]>('/system/roles', token),
  configs: (token: string) => request<any[]>('/system/configs', token),
  saveConfig: (token: string, key: string, type: string, value: string) => request<any>(`/system/configs/${encodeURIComponent(key)}`, token, { method: 'PUT', body: JSON.stringify({ type, value }) }),
}
