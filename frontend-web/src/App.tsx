import { FormEvent, useEffect, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowRight, Bell, Boxes, BriefcaseBusiness, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, ClipboardList, Clock3, Command, Download, FileCog,
  FileText, Gauge, Globe2, LayoutDashboard, LogOut, Menu, MoreHorizontal, PackageCheck, Plus, Search,
  Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Truck, Users, Warehouse, X, RefreshCw, ListFilter,
} from 'lucide-react'
import { api, InventoryItem, QualityInspection, Session, signIn, StockDocument, WarehouseItem } from './api'

type PageId = 'dashboard'|'line'|'receiving'|'raw'|'finished'|'count'|'transfer'|'other'|'migo'|'ga'|'quality'|'approvals'|'interfaces'|'forms'|'users'|'settings'
type Row = Record<string, string | number | boolean | string[] | undefined>

const navGroups: { label: string; items: { id: PageId; label: string; icon: typeof Boxes; badge?: string }[] }[] = [
  { label: '工作空间', items: [{ id: 'dashboard', label: 'WMS 看板', icon: LayoutDashboard }] },
  { label: '仓储作业', items: [
    { id: 'line', label: '线边仓管理', icon: Boxes }, { id: 'receiving', label: '收货与上架', icon: ArrowDownToLine },
    { id: 'raw', label: '原材料仓储', icon: Warehouse }, { id: 'finished', label: '成品仓储', icon: PackageCheck },
    { id: 'count', label: '盘点管理', icon: ClipboardCheck }, { id: 'transfer', label: '库存调拨', icon: ArrowLeftRight },
    { id: 'other', label: '其他作业', icon: MoreHorizontal },
  ] },
  { label: '质量与集成', items: [
    { id: 'migo', label: 'MIGO 管理', icon: FileText }, { id: 'ga', label: 'GA 类管理', icon: BriefcaseBusiness },
    { id: 'quality', label: '质量管理', icon: ShieldCheck }, { id: 'approvals', label: '审批中心', icon: ClipboardList, badge: '3' },
    { id: 'interfaces', label: '外围接口', icon: RefreshCw },
  ] },
  { label: '平台配置', items: [
    { id: 'forms', label: '动态表单与表格', icon: SlidersHorizontal }, { id: 'users', label: '用户与权限', icon: Users },
    { id: 'settings', label: '系统设置', icon: Settings2 },
  ] },
]

const pageMeta: Record<PageId, { title: string; subtitle: string; action?: string }> = {
  dashboard: { title: 'WMS 看板', subtitle: '掌握仓库运营状态与待办任务' },
  line: { title: '线边仓管理', subtitle: '生产线边物料配送、退料与补料作业', action: '新建线边配送' },
  receiving: { title: '收货与上架', subtitle: '采购到货、ASN 收货、质检与上架作业', action: '新建收货单' },
  raw: { title: '原材料仓储', subtitle: '原材料库存、批次追溯与库位管理', action: '库存调整' },
  finished: { title: '成品仓储', subtitle: '完工入库、成品库存与销售出库', action: '新建成品单' },
  count: { title: '盘点管理', subtitle: '循环盘点、全盘、差异复核与账务调整', action: '创建盘点任务' },
  transfer: { title: '库存调拨', subtitle: '跨仓、跨库区及库位间库存移动', action: '新建调拨单' },
  other: { title: '其他作业', subtitle: '杂项收发、报废、退货与库存调整', action: '新建其他单据' },
  migo: { title: 'MIGO 管理', subtitle: '对接 ERP 物料凭证，统一管理收发货过账', action: '新建 MIGO 单据' },
  ga: { title: 'GA 类管理', subtitle: '一般发料、费用领用与非生产性物料出库', action: '新建 GA 单据' },
  quality: { title: '质量管理', subtitle: '来料检验、过程检验、不合格品与质量放行', action: '登记质检单' },
  approvals: { title: '审批中心', subtitle: '统一处理仓储单据审批与异常复核' },
  interfaces: { title: '外围接口', subtitle: 'ERP、MES、TMS 与设备接口运行状态' },
  forms: { title: '动态表单与表格', subtitle: '按业务场景配置字段、表格列与校验规则' },
  users: { title: '用户与权限', subtitle: '管理租户成员、角色功能权限和仓库数据范围', action: '添加用户' },
  settings: { title: '系统设置', subtitle: '租户、单据规则、语言与集成参数' },
}

const initialInventory: InventoryItem[] = [
  { id: 1, warehouseCode: 'RM-01', locationCode: 'A-01-01', sku: 'MAT-1001', skuName: '冷轧钢板 1.2mm', lotNo: 'LOT-260930-01', quantity: 2400, uom: 'kg', qualityStatus: '合格', updatedAt: '2026-10-13T09:34:00' },
  { id: 2, warehouseCode: 'RM-01', locationCode: 'A-01-02', sku: 'MAT-1002', skuName: '铝型材 6061-T6', lotNo: 'LOT-261001-03', quantity: 860, uom: 'kg', qualityStatus: '合格', updatedAt: '2026-10-13T09:18:00' },
  { id: 3, warehouseCode: 'FG-01', locationCode: 'F-02-01', sku: 'FG-2001', skuName: '智能控制器 V3', lotNo: 'LOT-261010-02', quantity: 320, uom: 'pcs', qualityStatus: '合格', updatedAt: '2026-10-13T08:50:00' },
  { id: 4, warehouseCode: 'LINE-01', locationCode: 'L-01-01', sku: 'MAT-1001', skuName: '冷轧钢板 1.2mm', lotNo: 'LOT-260930-01', quantity: 180, uom: 'kg', qualityStatus: '合格', updatedAt: '2026-10-13T08:20:00' },
  { id: 5, warehouseCode: 'QA-01', locationCode: 'Q-01-01', sku: 'MAT-1014', skuName: '轴承 6204-ZZ', lotNo: 'LOT-261013-05', quantity: 64, uom: 'pcs', qualityStatus: '待检', updatedAt: '2026-10-13T07:55:00' },
  { id: 6, warehouseCode: 'FG-01', locationCode: 'F-01-03', sku: 'FG-2004', skuName: '智能传感器 S2', lotNo: 'LOT-261009-08', quantity: 96, uom: 'pcs', qualityStatus: '冻结', updatedAt: '2026-10-12T17:10:00' },
]
const initialDocuments: StockDocument[] = [
  { id: 1, docNo: 'ASN-20261013-0081', docType: 'INBOUND', status: 'PENDING_APPROVAL', targetWarehouse: 'RM-01', targetLocation: 'A-01-01', businessPartner: '宝钢供应链', sku: 'MAT-1001', skuName: '冷轧钢板 1.2mm', lotNo: 'LOT-261013-01', quantity: 520, uom: 'kg', createdBy: '张晓敏', createdAt: '2026-10-13T10:08:00' },
  { id: 2, docNo: 'MO-20261013-0154', docType: 'MIGO_OUT', status: 'APPROVED', sourceWarehouse: 'RM-01', sourceLocation: 'A-01-02', targetWarehouse: 'LINE-01', targetLocation: 'L-01-02', businessPartner: '制造一部', sku: 'MAT-1002', skuName: '铝型材 6061-T6', lotNo: 'LOT-261001-03', quantity: 48, uom: 'kg', createdBy: '李晨', createdAt: '2026-10-13T09:42:00' },
  { id: 3, docNo: 'DO-20261013-0039', docType: 'OUTBOUND', status: 'COMPLETED', sourceWarehouse: 'FG-01', sourceLocation: 'F-02-01', businessPartner: '华东销售部', sku: 'FG-2001', skuName: '智能控制器 V3', lotNo: 'LOT-261010-02', quantity: 36, uom: 'pcs', createdBy: '王宁', createdAt: '2026-10-13T09:20:00' },
  { id: 4, docNo: 'TR-20261013-0026', docType: 'TRANSFER', status: 'PENDING_APPROVAL', sourceWarehouse: 'RM-01', sourceLocation: 'A-01-01', targetWarehouse: 'LINE-01', targetLocation: 'L-01-01', businessPartner: '生产一部', sku: 'MAT-1001', skuName: '冷轧钢板 1.2mm', lotNo: 'LOT-260930-01', quantity: 120, uom: 'kg', createdBy: '陈宇', createdAt: '2026-10-13T08:56:00' },
  { id: 5, docNo: 'GA-20261013-0008', docType: 'GA_OUT', status: 'DRAFT', sourceWarehouse: 'RM-01', sourceLocation: 'A-01-02', businessPartner: '设备维修组', sku: 'MAT-1002', skuName: '铝型材 6061-T6', lotNo: 'LOT-261001-03', quantity: 6, uom: 'kg', createdBy: '周婧', createdAt: '2026-10-13T08:30:00' },
  { id: 6, docNo: 'QC-20261013-0034', docType: 'COUNT', status: 'DRAFT', sourceWarehouse: 'QA-01', businessPartner: '循环盘点', sku: 'MAT-1014', skuName: '轴承 6204-ZZ', lotNo: 'LOT-261013-05', quantity: 64, uom: 'pcs', createdBy: '赵强', createdAt: '2026-10-12T16:30:00' },
]
const initialQuality: QualityInspection[] = [
  { id: 1, inspectionNo: 'IQC-20261013-0034', sourceDocNo: 'ASN-20261013-0081', inspectionType: '来料检验', warehouseCode: 'QA-01', sku: 'MAT-1014', skuName: '轴承 6204-ZZ', lotNo: 'LOT-261013-05', status: 'PENDING', inspectedQty: 64, inspector: '赵强', createdAt: '2026-10-13T08:30:00' },
  { id: 2, inspectionNo: 'NCR-20261012-0019', inspectionType: '不合格处置', warehouseCode: 'FG-01', sku: 'FG-2004', skuName: '智能传感器 S2', lotNo: 'LOT-261009-08', status: 'HOLD', inspectedQty: 8, rejectedQty: 0, inspector: '林佳', createdAt: '2026-10-12T15:00:00' },
]
const initialUsers: Row[] = [
  { id: 1, username: 'admin', displayName: '系统管理员', roleCode:'tenant_admin',role: '租户管理员', warehouseScope: '全部仓库',warehouseScopeRaw:'ALL', permissions: '全部功能',permissionCodes:[],enabled:true, status: '正常', updatedAt: '2026-10-13T09:00:00' },
  { id: 2, username: 'zhangxm', displayName: '张晓敏', roleCode:'warehouse_manager',role: '仓库主管', warehouseScope: 'RM-01, LINE-01',warehouseScopeRaw:'RM-01,LINE-01', permissions: '仓储作业、审批',permissionCodes:[],enabled:true, status: '正常', updatedAt: '2026-10-12T16:22:00' },
  { id: 3, username: 'zhaoq', displayName: '赵强', roleCode:'quality_inspector',role: '质检员', warehouseScope: 'QA-01',warehouseScopeRaw:'QA-01', permissions: '质检、库存查询',permissionCodes:[],enabled:true, status: '正常', updatedAt: '2026-10-11T10:14:00' },
]
const warehousesDemo: WarehouseItem[] = [
  { code: 'RM-01', name: '原材料中心仓', type: '原材料仓', address: '上海 · 浦东' }, { code: 'FG-01', name: '成品总仓', type: '成品仓', address: '上海 · 浦东' },
  { code: 'LINE-01', name: '一号线边仓', type: '线边仓', address: '上海 · 制造一部' }, { code: 'QA-01', name: '待检与不合格品区', type: '质量仓', address: '上海 · 浦东' },
]

const fmtNumber = (n: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(n)
const dateLabel = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}
const docTypeLabel: Record<string, string> = { INBOUND: '采购收货', OUTBOUND: '销售出库', TRANSFER: '库存调拨', COUNT: '盘点任务', MIGO_IN: 'MIGO 入库', MIGO_OUT: 'MIGO 发料', GA_OUT: 'GA 费用领用', RETURN_IN: '退货入库', OTHER: '其他作业' }
const statusLabel: Record<string, string> = { DRAFT: '草稿', PENDING: '待检', PENDING_APPROVAL: '待审批', APPROVED: '待过账', REJECTED: '已驳回', COMPLETED: '已完成', CANCELLED: '已取消', 合格: '合格', 待检: '待检', 冻结: '冻结', PASS: '合格', HOLD: '待检', FAIL: '不合格' }
const englishLabels: Record<string,string> = {
  '工作空间':'Workspace','仓储作业':'Warehouse Operations','质量与集成':'Quality & Integration','平台配置':'Platform Configuration',
  'WMS 看板':'WMS Dashboard','线边仓管理':'Line-side Warehouse','收货与上架':'Receiving & Put-away','原材料仓储':'Raw Materials','成品仓储':'Finished Goods','盘点管理':'Cycle Counting','库存调拨':'Stock Transfer','其他作业':'Other Operations','MIGO 管理':'MIGO Management','GA 类管理':'GA Management','质量管理':'Quality Management','审批中心':'Approvals','外围接口':'Integrations','动态表单与表格':'Dynamic Forms & Tables','用户与权限':'Users & Permissions','系统设置':'System Settings',
  '掌握仓库运营状态与待办任务':'Warehouse operations, inventory health and tasks at a glance','生产线边物料配送、退料与补料作业':'Line-side delivery, returns and replenishment','采购到货、ASN 收货、质检与上架作业':'Purchase receipts, ASN, inspection and put-away','原材料库存、批次追溯与库位管理':'Raw-material inventory, lot traceability and locations','完工入库、成品库存与销售出库':'Finished goods, production receipts and sales dispatch','循环盘点、全盘、差异复核与账务调整':'Cycle counts, variance review and adjustments','跨仓、跨库区及库位间库存移动':'Warehouse, zone and bin transfers','杂项收发、报废、退货与库存调整':'Miscellaneous receipts, issues, returns and adjustments','对接 ERP 物料凭证，统一管理收发货过账':'ERP goods movements and posting control','一般发料、费用领用与非生产性物料出库':'General issues and non-production material requests','来料检验、过程检验、不合格品与质量放行':'Incoming and in-process inspection, nonconformance and release','统一处理仓储单据审批与异常复核':'Review warehouse documents and exceptions','ERP、MES、TMS 与设备接口运行状态':'ERP, MES, TMS and equipment interface health','按业务场景配置字段、表格列与校验规则':'Configure fields, table columns and validation by workflow','管理租户成员、角色功能权限和仓库数据范围':'Manage tenant members, role permissions and warehouse data scopes','租户、单据规则、语言与集成参数':'Tenant, document numbering, language and integration settings',
  '新建线边配送':'New line-side delivery','新建收货单':'New receipt','库存调整':'Inventory adjustment','新建成品单':'New finished-goods document','创建盘点任务':'Create count task','新建调拨单':'New transfer','新建其他单据':'New document','新建 MIGO 单据':'New MIGO document','新建 GA 单据':'New GA document','登记质检单':'Register inspection','添加用户':'Add user',
  '库存明细':'Inventory Details','待我审批':'Pending My Approval','质检与异常记录':'Inspections & Exceptions','租户用户':'Tenant Users','配置列表':'Configuration','接口运行日志':'Interface Activity','租户配置':'Tenant Settings','收货单据':'Receiving Documents','盘点任务':'Count Tasks','调拨单据':'Transfer Documents','MIGO 物料凭证':'MIGO Documents','GA 出库单据':'GA Issue Documents','其他仓储单据':'Other Warehouse Documents','业务单据':'Business Documents',
  '物料编码':'SKU','物料名称':'Description','仓库':'Warehouse','库位':'Location','批次号':'Lot','现有库存':'On Hand','质量状态':'Quality Status','更新时间':'Updated','用户名':'Username','姓名':'Name','角色':'Role','数据范围':'Data Scope','功能权限':'Permissions','状态':'Status','最近更新':'Last Updated','配置项':'Setting','配置内容':'Value','作用范围':'Scope','质检单号':'Inspection No.','检验类型':'Inspection Type','检验状态':'Inspection Status','创建时间':'Created','单据编号':'Document No.','单据类型':'Document Type','来源仓库':'From Warehouse','目标仓库':'To Warehouse','数量':'Quantity','单据状态':'Document Status',
  '全部状态':'All statuses','草稿':'Draft','待审批':'Pending approval','待过账':'Ready to post','已完成':'Completed','已驳回':'Rejected','待检':'Inspection pending','冻结':'On hold','合格':'Passed','不合格':'Rejected','正常':'Active','已停用':'Disabled','列配置':'Columns','导出':'Export','搜索当前列表':'Search this list','操作':'Actions','详情':'Details','审批':'Review','处置':'Disposition','显示列':'Visible columns','完成':'Done','显示':'Showing','条，共':'of','上一页':'Previous','下一页':'Next','20 条/页':'20 / page','50 条/页':'50 / page','100 条/页':'100 / page','搜索物料、单据或库位':'Search SKU, document or location','仓储管理系统':'Warehouse Management','帮助与支持':'Help & Support','退出登录':'Sign out','租户管理员':'Tenant Admin',
  '采购收货':'Purchase Receipt','销售出库':'Sales Issue','MIGO 入库':'MIGO Receipt','MIGO 发料':'MIGO Issue','GA 费用领用':'GA Issue','退货入库':'Return Receipt',
  '周二 · 运营概览':'Tuesday · Operations Overview','早上好，仓储团队':'Good morning, warehouse team','库存 SKU':'Inventory SKUs','库存批次':'Stock Positions','待处理单据':'Open Documents','待审批任务':'Pending Approvals','个':'items','张':'docs','今日新增 2':'2 added today','较上月':'vs last month','需关注':'Needs attention','当前待办':'Open tasks','审批队列':'Approval queue','仓库利用率':'Warehouse Utilization','各仓库当前库容占用':'Current capacity by warehouse','仓库总览':'All warehouses','库位实时同步':'Locations synced live','待办与审批':'Tasks & Approvals','需要您关注的任务':'Items that need your attention','所有审批已处理':'All approvals are clear','进入审批中心':'Go to approvals','近期仓储单据':'Recent Documents','按最近更新时间排序':'Sorted by most recently updated','查看全部':'View all','快捷作业':'Quick Actions','常用仓储流程':'Frequently used workflows','循环盘点':'Cycle Count','质检登记':'Inspect Goods','小提示：启用批次策略后，可自动校验先进先出规则。':'Tip: Enable lot policy to validate FIFO automatically.','查看今日待办':'View today’s tasks','原材料中心仓':'Raw Materials DC','成品总仓':'Finished Goods DC','线边仓':'Line-side Warehouse','待检与不合格品区':'QA & Hold Area','当前仓库':'Warehouse','库存实时更新':'Live inventory','库存品项':'Item count','现有库存量':'On hand','可用库存':'Available','质量冻结':'Quality holds','单位':'unit'
}
const tr = (value:string, language:string) => language==='English' ? englishLabels[value] || value : value
const roleLabels: Record<string,string> = { tenant_admin: '租户管理员', warehouse_manager: '仓库主管', operator: '仓库作业员', quality_inspector: '质检员' }
const rolePermissions: Record<string,string[]> = {
  tenant_admin: ['dashboard:read','warehouse:read','warehouse:write','inventory:read','document:read','document:create','document:submit','document:post','approval:read','approval:decide','quality:read','quality:inspect','quality:decide','integration:write','system:user:read','system:user:write','system:config:read','system:config:write'],
  warehouse_manager: ['dashboard:read','warehouse:read','warehouse:write','inventory:read','document:read','document:create','document:submit','document:post','approval:read','approval:decide','quality:read','quality:inspect','quality:decide'],
  operator: ['dashboard:read','warehouse:read','inventory:read','document:read','document:create','document:submit'],
  quality_inspector: ['dashboard:read','warehouse:read','inventory:read','document:read','approval:read','quality:read','quality:inspect','quality:decide'],
}
const pagePermission: Record<PageId,string> = { dashboard:'dashboard:read', line:'inventory:read', receiving:'document:read', raw:'inventory:read', finished:'inventory:read', count:'document:read', transfer:'document:read', other:'document:read', migo:'document:read', ga:'document:read', quality:'quality:read', approvals:'approval:read', interfaces:'integration:write', forms:'system:config:read', users:'system:user:read', settings:'system:config:read' }

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [page, setPage] = useState<PageId>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory)
  const [documents, setDocuments] = useState<StockDocument[]>(initialDocuments)
  const [quality, setQuality] = useState<QualityInspection[]>(initialQuality)
  const [users, setUsers] = useState<Row[]>(initialUsers)
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>(warehousesDemo)
  const [dashboard, setDashboard] = useState({ skuCount: 1248, inventoryLines: 3286, pendingApprovals: 3, openDocuments: 18 })
  const [uiConfigs, setUiConfigs] = useState<any[]>([])
  const [toast, setToast] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部状态')
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<Row | null>(null)
  const [accessEdit, setAccessEdit] = useState<Row|null>(null)
  const [configOpen, setConfigOpen] = useState(false)
  const [columns, setColumns] = useState<Record<string, string[]>>(() => { try { return JSON.parse(localStorage.getItem('easywms:table-columns') || '{}') } catch { return {} } })
  const [language, setLanguage] = useState<'简体中文'|'English'>(() => localStorage.getItem('easywms:language')==='English'?'English':'简体中文')
  const [profileOpen, setProfileOpen] = useState(false)
  const [login, setLogin] = useState({ tenantId: '1001', username: 'admin', password: 'admin123' })

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(t) }, [toast])

  const enterWorkspace = async (next: Session) => {
    setSession(next)
    localStorage.setItem('easywms:last-user', next.user.displayName)
    if (!next.offline) {
      setDocuments([]);setInventory([]);setQuality([]);setUsers([]);setWarehouses([]);setUiConfigs([]);setDashboard({skuCount:0,inventoryLines:0,pendingApprovals:0,openDocuments:0})
      const [d, docs, inv, wh, q, u, cfg] = await Promise.allSettled([api.dashboard(next.accessToken), api.documents(next.accessToken), api.inventory(next.accessToken), api.warehouses(next.accessToken), api.quality(next.accessToken), api.users(next.accessToken), api.configs(next.accessToken)])
      if (d.status === 'fulfilled') setDashboard(d.value)
      if (docs.status === 'fulfilled') setDocuments(docs.value)
      if (inv.status === 'fulfilled') setInventory(inv.value)
      if (wh.status === 'fulfilled') setWarehouses(wh.value)
      if (q.status === 'fulfilled') setQuality(q.value)
      if (u.status === 'fulfilled') setUsers(u.value.map(user => ({ ...user, role: roleLabels[user.roleCode] || user.roleCode, warehouseScopeRaw:user.warehouseScope,permissionCodes:user.permissions,warehouseScope: user.warehouseScope === 'ALL' ? '全部仓库' : user.warehouseScope?.split(',').join(', '), permissions: user.permissions?.length ? user.permissions.join(', ') : '无权限', status: user.enabled ? '正常' : '已停用', updatedAt: '—' })))
      if (cfg.status === 'fulfilled') {
        setUiConfigs(cfg.value)
        const serverColumns:Record<string,string[]>={}
        for(const item of cfg.value)if(item.configType==='TABLE'&&String(item.configKey).startsWith('table.')){try{serverColumns[item.configKey.slice(6)]=JSON.parse(item.configValue).columns}catch{}}
        setColumns(current=>({...serverColumns,...current}))
      }
    }
  }
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    const ssoError = new URLSearchParams(window.location.search).get('sso_error')
    if (!token) { if (ssoError) setLoginError('该企业账号尚未开通 EasyWMS，请联系租户管理员。'); return }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    void (async () => {
      try { const user = await api.currentUser(token); await enterWorkspace({ accessToken: token, user, offline: false }) }
      catch { setLoginError('单点登录已返回，但无法验证 WMS 用户。请联系管理员。') }
    })()
  }, [])
  const doLogin = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setLoginError('')
    try { await enterWorkspace(await signIn(login.tenantId, login.username, login.password)) }
    catch (error) { setLoginError(error instanceof Error ? error.message : '登录失败') }
    finally { setLoading(false) }
  }
  const notify = (message: string) => setToast(message)
  const selectPage = (id: PageId) => { setPage(id); setQuery(''); setStatusFilter('全部状态'); setMobileOpen(false); setDetail(null) }
  const logout = () => { setSession(null); setPage('dashboard'); setDetail(null) }

  if (!session) return <LoginScreen login={login} setLogin={setLogin} onSubmit={doLogin} loading={loading} error={loginError} language={language} onLanguageToggle={()=>{const next=language==='简体中文'?'English':'简体中文';setLanguage(next);localStorage.setItem('easywms:language',next)}} />

  const rawTitle = pageMeta[page]
  const title = { title:tr(rawTitle.title,language), subtitle:tr(rawTitle.subtitle,language), action:rawTitle.action?tr(rawTitle.action,language):undefined }
  const can = (permission:string) => session.user.permissions.includes('*') || session.user.permissions.includes(permission)
  const updateColumns = (target:PageId,next:string[]) => {
    setColumns(current=>{const value={...current,[target]:next};localStorage.setItem('easywms:table-columns',JSON.stringify(value));return value})
    if(!session.offline&&can('system:config:write'))void api.saveConfig(session.accessToken,`table.${target}`,'TABLE',JSON.stringify({columns:next})).catch(()=>{})
  }
  const saveUiConfig = async (key:string,type:string,value:string) => {
    try { if(!session.offline){const saved=await api.saveConfig(session.accessToken,key,type,value);setUiConfigs(current=>[...current.filter(c=>c.configKey!==key),saved])}else setUiConfigs(current=>[...current.filter(c=>c.configKey!==key),{configKey:key,configType:type,configValue:value}]);notify('配置已保存到当前租户') }
    catch(error){notify(error instanceof Error?error.message:'配置保存失败')}
  }
  const visibleNavGroups = navGroups.map(group => ({ ...group, items: group.items.filter(item => can(pagePermission[item.id])) })).filter(group => group.items.length)
  const docsForPage = (() => {
    switch (page) {
      case 'receiving': return documents.filter(d => ['INBOUND', 'RETURN_IN'].includes(d.docType))
      case 'count': return documents.filter(d => d.docType === 'COUNT')
      case 'transfer': return documents.filter(d => d.docType === 'TRANSFER')
      case 'other': return documents.filter(d => ['OTHER', 'RETURN_IN'].includes(d.docType))
      case 'migo': return documents.filter(d => d.docType.startsWith('MIGO'))
      case 'ga': return documents.filter(d => d.docType.startsWith('GA'))
      case 'approvals': return documents.filter(d => d.status === 'PENDING_APPROVAL')
      default: return documents
    }
  })()
  const baseRows = getRows(page, inventory, docsForPage, warehouses, quality, users)
  const pageColumns = getColumns(page).map(column=>({...column,label:tr(column.label,language)}))
  const shownCols = columns[page] || pageColumns.map(c => c.key)
  const filteredRows = baseRows.filter(row => {
    const text = Object.values(row).join(' ').toLowerCase()
    const queryMatch = !query || text.includes(query.toLowerCase())
    const status = String(row.status || '')
    const statusMatch = statusFilter === '全部状态' || status === statusFilter
    return queryMatch && statusMatch
  })
  const selectedMenu = navGroups.flatMap(g => g.items).find(i => i.id === page)
  const SelectedMenuIcon = selectedMenu?.icon
  const actionPermission = page==='users'?'system:user:write':page==='quality'?'quality:inspect':page==='settings'||page==='forms'?'system:config:write':page==='raw'?'document:post':'document:create'
  const pageAction = can(actionPermission) ? title.action : undefined

  const createDocument = async (form: Record<string, string>) => {
    const payload = {
      docNo: form.docNo || undefined, docType: form.docType, sourceWarehouse: form.sourceWarehouse || undefined,
      sourceLocation: form.sourceLocation || undefined, targetWarehouse: form.targetWarehouse || undefined,
      targetLocation: form.targetLocation || undefined, businessPartner: form.businessPartner || undefined,
      sku: form.sku, skuName: form.skuName, lotNo: form.lotNo || '', quantity: Number(form.quantity), uom: form.uom || 'pcs',
    }
    try {
      let created: StockDocument
      if (session.offline) created = { ...payload, docNo: payload.docNo || `WMS-${Date.now()}`, status: 'DRAFT', createdBy: session.user.displayName, createdAt: new Date().toISOString(), id: Date.now() }
      else created = await api.createDocument(session.accessToken, payload)
      setDocuments(current => [created, ...current]); setDashboard(current => ({ ...current, openDocuments: current.openDocuments + 1 })); setModalOpen(false)
      notify(`单据 ${created.docNo} 已保存为草稿`)
    } catch (error) { notify(error instanceof Error ? error.message : '保存失败') }
  }

  const createQuality = async (form: Record<string,string>) => {
    const payload = { inspectionNo: form.inspectionNo || undefined, sourceDocNo: form.sourceDocNo || undefined, inspectionType: form.inspectionType, warehouseCode: form.warehouseCode, sku: form.sku, skuName: form.skuName, lotNo: form.lotNo, inspectedQty: Number(form.inspectedQty), remark: form.remark }
    try {
      const created: QualityInspection = session.offline ? { ...payload, inspectionNo: payload.inspectionNo || `IQC-${Date.now()}`, status: 'PENDING', inspector: session.user.username, createdAt: new Date().toISOString(), id: Date.now() } : await api.createQuality(session.accessToken, payload)
      setQuality(current => [created, ...current]); setModalOpen(false); notify(`质检单 ${created.inspectionNo} 已登记`)
    } catch (error) { notify(error instanceof Error ? error.message : '质检单登记失败') }
  }

  const createUser = async (form: Record<string,string>) => {
    const permissions = rolePermissions[form.roleCode] || []
    const warehouseScope = form.warehouseScope.trim() ? form.warehouseScope.split(',').map(code => code.trim()).filter(Boolean) : []
    try {
      let user: Row
      if (session.offline) user = { id: Date.now(), username: form.username, displayName: form.displayName,roleCode:form.roleCode, role: roleLabels[form.roleCode],warehouseScopeRaw:warehouseScope.length?warehouseScope.join(','):'ALL', warehouseScope: warehouseScope.length ? warehouseScope.join(', ') : '全部仓库', permissionCodes:permissions, permissions: permissions.map(p=>p.split(':')[0]).join(', '),enabled:true, status: '正常', updatedAt: new Date().toISOString() }
      else { const created = await api.createUser(session.accessToken, { username: form.username, password: form.password, displayName: form.displayName, roleCode: form.roleCode, permissions, warehouseScope }); user = { ...created, role: roleLabels[created.roleCode] || created.roleCode,warehouseScopeRaw:created.warehouseScope,permissionCodes:created.permissions, warehouseScope: created.warehouseScope === 'ALL' ? '全部仓库' : created.warehouseScope, permissions: created.permissions?.join(', ') || '无权限', status: created.enabled ? '正常' : '已停用', updatedAt: new Date().toISOString() } }
      setUsers(current => [user, ...current]); setModalOpen(false); notify(`用户 ${form.username} 已创建`)
    } catch (error) { notify(error instanceof Error ? error.message : '用户创建失败') }
  }

  const updateUserAccess = async (userId:number,form:Record<string,string>) => {
    const permissions=rolePermissions[form.roleCode]||[]
    const warehouseScope=form.warehouseScope.trim()?form.warehouseScope.split(',').map(code=>code.trim()).filter(Boolean):[]
    const enabled=form.enabled==='true'
    try {
      let updated:Row
      if(session.offline)updated={roleCode:form.roleCode,role:roleLabels[form.roleCode],warehouseScopeRaw:warehouseScope.length?warehouseScope.join(','):'ALL',warehouseScope:warehouseScope.length?warehouseScope.join(', '):'全部仓库',permissionCodes:permissions,permissions:permissions.map(p=>p.split(':')[0]).join(', '),enabled,status:enabled?'正常':'已停用',updatedAt:new Date().toISOString()}
      else {const saved=await api.updateUserAccess(session.accessToken,userId,{roleCode:form.roleCode,permissions,warehouseScope,enabled});updated={...saved,role:roleLabels[saved.roleCode]||saved.roleCode,warehouseScopeRaw:saved.warehouseScope,warehouseScope:saved.warehouseScope==='ALL'?'全部仓库':saved.warehouseScope?.split(',').join(', '),permissionCodes:saved.permissions,permissions:saved.permissions?.join(', ')||'无权限',status:saved.enabled?'正常':'已停用',updatedAt:new Date().toISOString()}}
      setUsers(current=>current.map(user=>user.id===userId?{...user,...updated}:user));setAccessEdit(null);notify('用户权限与数据范围已更新')
    }catch(error){notify(error instanceof Error?error.message:'权限更新失败')}
  }

  const runQualityAction = async (row: Row, result: 'PASS'|'HOLD'|'REJECT') => {
    try {
      const id = Number(row.id)
      if (!session.offline && id) await api.decideQuality(session.accessToken, id, result)
      const next = result === 'PASS' ? 'PASS' : result === 'HOLD' ? 'HOLD' : 'REJECTED'
      const qualityStatus = result === 'PASS' ? '合格' : result === 'HOLD' ? '待检' : '冻结'
      setQuality(current => current.map(q => q.id === id || q.inspectionNo === row.inspectionNo ? { ...q, status: next } : q))
      setInventory(current => current.map(i => i.sku === row.sku && i.lotNo === row.lotNo ? { ...i, qualityStatus } : i))
      setDetail(null); notify(result === 'PASS' ? '质检已放行' : result === 'HOLD' ? '批次已暂挂' : '不合格批次已冻结')
    } catch (error) { notify(error instanceof Error ? error.message : '质检处置失败') }
  }

  const runDocumentAction = async (row: Row, action: 'SUBMIT'|'APPROVE'|'REJECT'|'COMPLETE'|'CANCEL') => {
    const id = Number(row.id)
    try {
      if (!session.offline && id) await api.documentAction(session.accessToken, id, action)
      const nextStatus: Record<typeof action, string> = { SUBMIT: 'PENDING_APPROVAL', APPROVE: 'APPROVED', REJECT: 'REJECTED', COMPLETE: 'COMPLETED', CANCEL: 'CANCELLED' }
      setDocuments(current => current.map(d => d.id === id || d.docNo === row.docNo ? { ...d, status: nextStatus[action] } : d)); setDetail(null)
      notify(action === 'APPROVE' ? '审批已通过' : action === 'REJECT' ? '单据已驳回' : action === 'COMPLETE' ? '库存已过账' : action === 'SUBMIT' ? '单据已提交审批' : '单据已取消')
    } catch (error) { notify(error instanceof Error ? error.message : '操作失败') }
  }

  const exportRows = () => {
    const csv = [pageColumns.filter(c => shownCols.includes(c.key)).map(c => c.label).join(','), ...filteredRows.map(row => pageColumns.filter(c => shownCols.includes(c.key)).map(c => `"${String(row[c.key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `${page}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
    notify('当前列表已导出')
  }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Boxes size={20} strokeWidth={2.4} /></div><div className="brand-copy"><strong>easy<span>WMS</span></strong><small>WAREHOUSE CLOUD</small></div><button className="icon-button sidebar-close" onClick={() => setMobileOpen(false)} aria-label="关闭菜单"><X size={18}/></button></div>
      <button className="tenant-switch" onClick={() => notify('当前租户：华东制造集团 · DEMO')}><div className="tenant-logo">华</div><span className="tenant-text"><strong>华东制造集团</strong><small>企业租户 · DEMO</small></span><ChevronDown size={15}/></button>
      <nav className="nav-scroll">
        {visibleNavGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-label">{tr(group.label,language)}</div>{group.items.map(item => {
          const Icon = item.icon
          return <button key={item.id} onClick={() => selectPage(item.id)} className={`nav-item ${page === item.id ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8}/><span>{tr(item.label,language)}</span>{item.badge && <b className="nav-badge">{item.badge}</b>}</button>
        })}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="plan-card"><div className="plan-icon"><Sparkles size={15}/></div><div><strong>仓储运营状态</strong><span>运行正常 · 4 个仓库</span></div><span className="online-dot"/></div><button className="sidebar-help" onClick={() => notify('帮助中心：请查看项目 README 与 API 文档')}><CircleHelp size={16}/>帮助与支持<ChevronRight size={14}/></button></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="关闭导航"/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="打开菜单"><Menu size={20}/></button><div className="breadcrumb"><span>{tr('工作空间',language)}</span><ChevronRight size={14}/><strong>{title.title}</strong></div></div><div className="topbar-actions"><label className="global-search"><Search size={16}/><input placeholder={tr('搜索物料、单据或库位',language)} onChange={e => setQuery(e.target.value)} value={query}/><kbd><Command size={11}/> K</kbd></label><button className="language-button" onClick={() => {const next=language==='简体中文'?'English':'简体中文';setLanguage(next);localStorage.setItem('easywms:language',next)}}><Globe2 size={16}/><span>{language}</span><ChevronDown size={13}/></button><button className="icon-button notification-button" onClick={() => selectPage('approvals')} aria-label="查看通知"><Bell size={18}/><i/></button><div className="top-divider"/><div className="profile-menu"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)}><div className="avatar">{session.user.displayName.slice(0, 1)}</div><span><b>{session.user.displayName}</b><small>{language==='English'?'Tenant Admin':roleLabels[session.user.role]||session.user.role}</small></span><ChevronDown size={14}/></button>{profileOpen&&<div className="profile-popover"><strong>{session.user.displayName}</strong><small>{language==='English'?'Tenant':'租户'} {session.user.tenantId} · {session.user.username}</small><button onClick={logout}><LogOut size={14}/>{tr('退出登录',language)}</button></div>}</div></div></header>
      <div className="content-scroll"><div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/>{tr('仓储管理系统',language)} <span className="eyebrow-separator">/</span> {tr(selectedMenu?.label || 'WMS',language)}</div><h1>{title.title}</h1><p>{title.subtitle}</p></div><div className="heading-actions">{session.offline && <span className="demo-chip"><span/>{language==='English'?'Demo mode':'演示模式'}</span>}{pageAction && <button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={16}/>{pageAction}</button>}</div></div>
        {page === 'dashboard' ? <Dashboard dashboard={dashboard} documents={documents} inventory={inventory} onGo={selectPage} onDetail={setDetail} language={language} canPage={id=>can(pagePermission[id])}/> : <>
          {['raw','finished','line'].includes(page) && <InventorySummary inventory={inventory} warehouses={warehouses} page={page} language={language}/>}
          {page === 'users' ? <UserAccessPanel count={users.length} onAdd={() => setModalOpen(true)} notify={notify}/> : page === 'settings' ? <SettingsPanel language={language} notify={notify}/> : page === 'forms' ? <DynamicConfigPanel columns={columns} onUpdateColumns={updateColumns} onSaveConfig={saveUiConfig} notify={notify}/> : page === 'interfaces' ? <IntegrationPanel notify={notify}/> : page === 'quality' ? <QualityPanel notify={notify}/> : null}
          <section className="data-panel"><div className="panel-toolbar"><div className="toolbar-title"><div className="section-symbol">{SelectedMenuIcon && <SelectedMenuIcon size={17}/>}</div><div><h2>{tr(panelTitle(page),language)}</h2><p>{language==='English'?`${filteredRows.length} records`:`共 ${filteredRows.length} 条记录`}</p></div></div><div className="table-actions"><label className="table-search"><Search size={15}/><input placeholder={language==='English'?'Search this list':'搜索当前列表'} value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ F</kbd></label>{!['users','settings','forms','interfaces','quality'].includes(page) && <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="全部状态">{tr('全部状态',language)}</option><option value="DRAFT">{tr('草稿',language)}</option><option value="PENDING_APPROVAL">{tr('待审批',language)}</option><option value="APPROVED">{tr('待过账',language)}</option><option value="COMPLETED">{tr('已完成',language)}</option><option value="REJECTED">{tr('已驳回',language)}</option><option value="待检">{tr('待检',language)}</option><option value="冻结">{tr('冻结',language)}</option></select>}<div className="column-control"><button className={`secondary-button compact ${configOpen ? 'selected' : ''}`} onClick={() => setConfigOpen(!configOpen)}><SlidersHorizontal size={15}/><span>{tr('列配置',language)}</span></button>{configOpen && <div className="column-popover"><strong>{tr('显示列',language)}</strong>{pageColumns.map(col => <label key={col.key}><input type="checkbox" checked={shownCols.includes(col.key)} onChange={e => updateColumns(page,e.target.checked?[...shownCols,col.key]:shownCols.filter(k=>k!==col.key))}/>{col.label}</label>)}<button onClick={() => setConfigOpen(false)}>{tr('完成',language)}</button></div>}</div><button className="secondary-button compact export-button" onClick={exportRows}><Download size={15}/><span>{tr('导出',language)}</span></button></div></div>
            <div className="table-wrap"><table><thead><tr><th className="check-cell"><input type="checkbox" aria-label="选择全部"/></th>{pageColumns.filter(c => shownCols.includes(c.key)).map(c => <th key={c.key}>{c.label}</th>)}<th className="action-head">{tr('操作',language)}</th></tr></thead><tbody>{filteredRows.length ? filteredRows.map((row, index) => <tr key={String(row.id ?? row.docNo ?? row.inspectionNo ?? row.sku ?? index)}><td className="check-cell"><input type="checkbox" aria-label={`选择第 ${index + 1} 行`}/></td>{pageColumns.filter(c => shownCols.includes(c.key)).map(c => <td key={c.key}>{renderCell(c.key, row[c.key],language)}</td>)}<td className="row-actions"><button className="text-button" onClick={() => setDetail(row)}>{tr('详情',language)}</button>{page==='users'&&can('system:user:write')&&<button className="text-button" onClick={()=>setAccessEdit(row)}>{language==='English'?'Access':'权限'}</button>}{row.status === 'PENDING_APPROVAL' && can('approval:decide') && <button className="text-button" onClick={() => runDocumentAction(row, 'APPROVE')}>{tr('审批',language)}</button>}{page==='quality'&&row.status==='PENDING'&&can('quality:decide')&&<button className="text-button" onClick={() => setDetail(row)}>{tr('处置',language)}</button>}<button className="row-more" aria-label="更多操作" onClick={() => setDetail(row)}><MoreHorizontal size={17}/></button></td></tr>) : <tr><td colSpan={shownCols.length + 2}><EmptyState query={query}/></td></tr>}</tbody></table></div>
            <div className="table-footer"><span>{language==='English'?'Showing':'显示'} <b>{filteredRows.length ? 1 : 0}-{filteredRows.length}</b> {language==='English'?'of':'条，共'} <b>{baseRows.length}</b> {language==='English'?'records':'条'}</span><div className="pagination"><button disabled>{tr('上一页',language)}</button><button className="current-page">1</button><button disabled>{tr('下一页',language)}</button><select aria-label="每页条数"><option>{tr('20 条/页',language)}</option><option>{tr('50 条/页',language)}</option><option>{tr('100 条/页',language)}</option></select></div></div>
          </section>
        </>}
        <footer className="page-footer"><span>© 2026 EasyWMS 仓储云平台 · {uiConfigs.length} 项租户配置</span><span><i/>所有系统运行正常</span></footer>
      </div></div>
    </main>
    {modalOpen && page==='quality' && <QualityModal warehouses={warehouses} onClose={() => setModalOpen(false)} onSubmit={createQuality}/>}
    {modalOpen && page==='users' && <UserModal onClose={() => setModalOpen(false)} onSubmit={createUser}/>}
    {modalOpen && !['quality','users'].includes(page) && <DocumentModal page={page} warehouses={warehouses} onClose={() => setModalOpen(false)} onSubmit={createDocument}/>}
    {accessEdit && <UserAccessModal user={accessEdit} onClose={()=>setAccessEdit(null)} onSubmit={form=>updateUserAccess(Number(accessEdit.id),form)}/>}
    {detail && <DetailDrawer row={detail} onClose={() => setDetail(null)} onAction={action => runDocumentAction(detail, action)} onQualityAction={result => runQualityAction(detail,result)} can={can}/>}
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function LoginScreen({ login, setLogin, onSubmit, loading, error, language, onLanguageToggle }: { login: { tenantId: string; username: string; password: string }; setLogin: (v: any) => void; onSubmit: (e: FormEvent) => void; loading: boolean; error: string; language:string; onLanguageToggle:()=>void }) {
  const startSso = async () => {
    try {
      const config = await api.ssoConfig()
      if (!config.enabled) { window.alert(language==='English'?'Enable OIDC on the server first. See README for setup.':'请先在服务端启用 OIDC 单点登录，配置方式见 README。'); return }
      const apiRoot = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '')
      window.location.href = `${apiRoot}/api/v1/auth/sso/start?client=web`
    } catch (e) { window.alert(e instanceof Error ? e.message : '无法连接到 WMS 服务') }
  }
  const en=language==='English'
  return <div className="login-screen">
    <div className="login-art"><div className="login-glow"/><div className="login-brand"><div className="brand-mark"><Boxes size={21}/></div><strong>easy<span>WMS</span></strong></div>
      <div className="login-art-copy"><div className="login-kicker"><span/>SMART WAREHOUSE PLATFORM</div><h1>{en?<>Warehouse operations<br/>made clear and connected.</>:<>让仓储协同<br/>更简单、更准确。</>}</h1><p>{en?'From receiving and put-away to picking and shipping, connect the shop floor to your supply chain.':'从收货、上架到拣选、发运，连接制造现场与供应链每一个环节。'}</p><div className="login-mini-grid"><div><b>{en?'Live inventory':'实时库存'}</b><span>{en?'Accurate lots and traceability':'账实同步 · 批次追溯'}</span></div><div><b>{en?'Connected operations':'一体化协同'}</b><span>ERP · MES · TMS</span></div><div><b>{en?'Precise execution':'精细化作业'}</b><span>{en?'Locations · containers · PDA':'库位 · 容器 · PDA'}</span></div></div></div>
      <div className="login-art-foot"><span>© 2026 EasyWMS</span><span>{en?'Warehouse operations platform':'工业级仓储管理平台'}</span></div>
    </div>
    <div className="login-form-side"><button className="login-language" onClick={onLanguageToggle}><Globe2 size={14}/>{language}</button><div className="login-form-wrap"><span className="login-welcome">{en?'Welcome back':'欢迎回来'}</span><h2>{en?'Sign in to EasyWMS':'登录仓储平台'}</h2><p className="login-desc">{en?'Enter your tenant and account details':'请输入您的租户与账号信息'}</p>
      <form onSubmit={onSubmit}><label className="form-label">{en?'Tenant ID':'租户 ID'}<input value={login.tenantId} onChange={e => setLogin({ ...login, tenantId: e.target.value })} required/></label><label className="form-label">{en?'Username':'用户名'}<input value={login.username} onChange={e => setLogin({ ...login, username: e.target.value })} autoComplete="username" required/></label><label className="form-label">{en?'Password':'密码'}<input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} autoComplete="current-password" required/></label>
        <div className="login-options"><label><input type="checkbox" defaultChecked/> {en?'Remember me':'记住我'}</label><button type="button" onClick={() => window.alert(en?'Contact your tenant administrator to reset your password.':'请联系企业管理员重置密码。')}>{en?'Forgot password?':'忘记密码？'}</button></div>{error && <div className="login-error">{error}</div>}
        <button className="login-submit" disabled={loading}>{loading ? (en?'Signing in…':'正在登录…') : (en?'Sign in':'登 录')}<ArrowRight size={16}/></button><button className="sso-submit" type="button" onClick={startSso}><ShieldCheck size={16}/>{en?'Continue with enterprise SSO':'使用企业单点登录'}</button>
      </form><div className="login-demo"><Sparkles size={14}/><span>{en?'Demo account':'演示账号'}：<b>admin</b> / <b>admin123</b> · {en?'Tenant':'租户'} 1001</span></div><div className="login-footer">{en?'Secure, traceable warehouse operations':'安全、稳定、可追溯的仓储运营底座'}</div>
    </div></div>
  </div>
}

function Dashboard({ dashboard, documents, inventory, onGo, onDetail, language, canPage }: { dashboard: { skuCount: number; inventoryLines: number; pendingApprovals: number; openDocuments: number }; documents: StockDocument[]; inventory: InventoryItem[]; onGo: (id: PageId) => void; onDetail: (row: Row) => void; language:string; canPage:(id:PageId)=>boolean }) {
  const pending = documents.filter(d => d.status === 'PENDING_APPROVAL').slice(0, 3)
  const recent = documents.slice(0, 4)
  const warehouseStats = [
    { name: '原材料中心仓', code: 'RM-01', value: 72, amount: '3,260', tone: 'blue' }, { name: '成品总仓', code: 'FG-01', value: 54, amount: '1,842', tone: 'green' },
    { name: '线边仓', code: 'LINE-01', value: 38, amount: '968', tone: 'orange' }, { name: '待检与不合格品区', code: 'QA-01', value: 16, amount: '246', tone: 'purple' },
  ]
  const kpis = [
    { label: tr('库存 SKU',language), value: fmtNumber(dashboard.skuCount), unit: language==='English'?'SKUs':'个', icon: Boxes, color: 'blue', trend: '+8.2%', foot: tr('较上月',language) },
    { label: tr('库存批次',language), value: fmtNumber(dashboard.inventoryLines), unit: language==='English'?'lines':'条', icon: PackageCheck, color: 'green', trend: '+3.6%', foot: tr('较上月',language) },
    { label: tr('待处理单据',language), value: String(dashboard.openDocuments).padStart(2, '0'), unit: language==='English'?'docs':'张', icon: FileText, color: 'orange', trend: tr('需关注',language), foot: tr('当前待办',language) },
    { label: tr('待审批任务',language), value: String(dashboard.pendingApprovals).padStart(2, '0'), unit: language==='English'?'tasks':'项', icon: ClipboardCheck, color: 'purple', trend: tr('今日新增 2',language), foot: tr('审批队列',language) },
  ]
  return <div className="dashboard-view"><div className="welcome-banner"><div><div className="welcome-caption"><Sparkles size={14}/>{tr('周二 · 运营概览',language)}</div><h2>{tr('早上好，仓储团队',language)} <span>👋</span></h2><p>{language==='English'?<>You have <b>{dashboard.pendingApprovals} approvals</b> and <b>{inventory.filter(i=>['待检','冻结'].includes(i.qualityStatus)).length} quality alerts</b> waiting for review.</>:<>今天有 <b>{dashboard.pendingApprovals} 项审批</b> 和 <b>{inventory.filter(i => ['待检','冻结'].includes(i.qualityStatus)).length} 个质量提醒</b> 等待处理。</>}</p></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-box box-back"><Boxes size={24}/></div><div className="art-box box-front"><Warehouse size={27}/></div><div className="art-dot"/></div>{canPage('approvals')&&<button className="banner-link" onClick={() => onGo('approvals')}>{tr('查看今日待办',language)} <ArrowRight size={15}/></button>}</div>
    <div className="kpi-grid">{kpis.map(({ label,value,unit,icon:Icon,color,trend,foot }) => <div className="kpi-card" key={label}><div className={`kpi-icon ${color}`}><Icon size={18}/></div><span className="kpi-label">{label}</span><div className="kpi-value">{value}<small>{unit}</small></div><div className="kpi-foot"><span className={color === 'orange' || color === 'purple' ? 'quiet-trend' : 'positive-trend'}>{color === 'orange' ? <Clock3 size={12}/> : color === 'purple' ? <Activity size={12}/> : <span>↗</span>}{trend}</span><span>{foot}</span></div><div className={`kpi-decoration ${color}`}/></div>)}</div>
    <div className="dashboard-grid"><section className="dash-panel warehouse-panel"><div className="dash-panel-heading"><div><h3>{tr('仓库利用率',language)}</h3><p>{tr('各仓库当前库容占用',language)}</p></div>{canPage('raw')&&<button className="subtle-link" onClick={() => onGo('raw')}>{tr('仓库总览',language)} <ArrowRight size={14}/></button>}</div><div className="warehouse-bars">{warehouseStats.map(w => <div className="warehouse-bar-row" key={w.code}><div className="warehouse-name"><span className={`warehouse-dot ${w.tone}`}/><b>{tr(w.name,language)}</b><small>{w.code}</small></div><div className="bar-track"><div className={`bar-fill ${w.tone}`} style={{ width: `${w.value}%` }}/></div><strong>{w.value}%</strong><span className="bar-amount">{w.amount}</span></div>)}</div><div className="panel-bottom-note"><span><i/>{tr('库位实时同步',language)}</span><span>{language==='English'?'Updated 10:24:36':'最后更新 10:24:36'}</span></div></section>
      {canPage('approvals')&&<section className="dash-panel tasks-panel"><div className="dash-panel-heading"><div><h3>{tr('待办与审批',language)}</h3><p>{tr('需要您关注的任务',language)}</p></div><span className="task-count">{pending.length.toString().padStart(2,'0')}</span></div><div className="task-list">{pending.length ? pending.map(d => <button className="task-row" key={d.docNo} onClick={() => onDetail(documentToRow(d))}><span className="task-marker"><ClipboardCheck size={15}/></span><span className="task-copy"><b>{(language==='English'?englishLabels[docTypeLabel[d.docType]]:docTypeLabel[d.docType]) || d.docType} · {d.skuName}</b><small>{d.docNo} <i/> {dateLabel(d.createdAt)}</small></span><span className="task-status">{tr('待审批',language)}</span><ChevronRight size={15}/></button>) : <div className="task-empty"><CheckCircle2 size={20}/>{tr('所有审批已处理',language)}</div>}</div><button className="tasks-link" onClick={() => onGo('approvals')}>{tr('进入审批中心',language)} <ArrowRight size={14}/></button></section>}</div>
    <div className="dashboard-grid bottom-grid"><section className="dash-panel recent-panel"><div className="dash-panel-heading"><div><h3>{tr('近期仓储单据',language)}</h3><p>{tr('按最近更新时间排序',language)}</p></div>{canPage('receiving')&&<button className="subtle-link" onClick={() => onGo('receiving')}>{tr('查看全部',language)} <ArrowRight size={14}/></button>}</div><div className="recent-list">{recent.map(doc => <button className="recent-row" key={doc.docNo} onClick={() => onDetail(documentToRow(doc))}><span className={`recent-type-icon ${doc.docType.startsWith('IN') ? 'in' : doc.docType.includes('OUT') ? 'out' : 'move'}`}><FileText size={16}/></span><span className="recent-main"><b>{doc.docNo}</b><small>{(language==='English'?englishLabels[docTypeLabel[doc.docType]]:docTypeLabel[doc.docType]) || doc.docType} · {doc.skuName}</small></span><span className="recent-qty">{fmtNumber(doc.quantity)} <small>{doc.uom}</small></span><StatusPill value={doc.status} language={language}/><span className="recent-time">{dateLabel(doc.createdAt)}</span></button>)}</div></section><section className="dash-panel quick-panel"><div className="dash-panel-heading"><div><h3>{tr('快捷作业',language)}</h3><p>{tr('常用仓储流程',language)}</p></div><span className="quick-spark"><Sparkles size={15}/></span></div><div className="quick-grid">{[{ label:'采购收货',icon:ArrowDownToLine,id:'receiving' as PageId,tone:'blue' },{ label:'库存调拨',icon:ArrowLeftRight,id:'transfer' as PageId,tone:'orange' },{ label:'循环盘点',icon:ClipboardCheck,id:'count' as PageId,tone:'purple' },{ label:'质检登记',icon:ShieldCheck,id:'quality' as PageId,tone:'green' }].filter(q=>canPage(q.id)).map(q => <button key={q.label} className="quick-action" onClick={() => onGo(q.id)}><span className={`quick-icon ${q.tone}`}><q.icon size={18}/></span><b>{tr(q.label,language)}</b><ArrowRight size={13}/></button>)}</div><div className="quick-tip"><span className="tip-star">✦</span><span>{tr('小提示：启用批次策略后，可自动校验先进先出规则。',language)}</span></div></section></div>
  </div>
}

function InventorySummary({ inventory, warehouses, page, language }: { inventory: InventoryItem[]; warehouses: WarehouseItem[]; page: PageId; language:string }) {
  const selected = page === 'raw' ? ['RM-01'] : page === 'finished' ? ['FG-01'] : ['LINE-01']
  const items = inventory.filter(i => selected.includes(i.warehouseCode))
  const total = items.reduce((sum, i) => sum + i.quantity, 0)
  const wh = warehouses.find(w => w.code === selected[0])
  return <div className="inventory-overview"><div className="inventory-intro"><div className="inventory-warehouse-icon"><Warehouse size={19}/></div><div><span>{tr('当前仓库',language)}</span><h3>{wh?.name || selected[0]} <small>{selected[0]}</small></h3></div><div className="inventory-intro-right"><span><i/>{tr('库存实时更新',language)}</span><b><Clock3 size={13}/> {language==='English'?'Updated 10:24':'更新于 10:24'}</b></div></div><div className="inventory-metrics"><div><span>{tr('库存品项',language)}</span><b>{items.length.toLocaleString()} <small>SKU</small></b></div><div><span>{tr('现有库存量',language)}</span><b>{fmtNumber(total)} <small>{items[0]?.uom || tr('单位',language)}</small></b></div><div><span>{tr('可用库存',language)}</span><b>{fmtNumber(total - items.filter(i => i.qualityStatus !== '合格').reduce((s,i) => s+i.quantity,0))} <small>{items[0]?.uom || tr('单位',language)}</small></b></div><div><span>{tr('质量冻结',language)}</span><b className="metric-alert">{items.filter(i => i.qualityStatus !== '合格').length} <small>{language==='English'?'lots':'批次'}</small></b></div></div></div>
}

function UserAccessPanel({ count, onAdd, notify }: { count:number; onAdd: () => void; notify: (s:string)=>void }) {
  return <div className="config-cards"><div className="config-summary"><div className="config-summary-icon"><Users size={19}/></div><div><b>租户成员</b><span>管理组织内用户与角色授权</span></div><strong>{count} <small>位用户</small></strong></div><div className="permission-tiles"><button onClick={() => notify('已打开角色模板：租户管理员、仓库主管、作业员、质检员')}><ShieldCheck size={17}/><span><b>角色权限</b><small>4 个角色模板</small></span><ChevronRight size={15}/></button><button onClick={() => notify('数据范围按仓库授权，可配置为全部仓库或指定仓库')}><Warehouse size={17}/><span><b>数据范围</b><small>按仓库进行数据隔离</small></span><ChevronRight size={15}/></button><button onClick={() => notify('单点登录配置可在服务端接入企业 OIDC')}><Globe2 size={17}/><span><b>单点登录</b><small>OIDC / OAuth 2.0</small></span><ChevronRight size={15}/></button></div><button className="secondary-button compact" onClick={onAdd}><Plus size={15}/>添加用户</button></div>
}

function SettingsPanel({ language, notify }: { language: string; notify: (s:string)=>void }) {
  return <div className="settings-grid"><div className="setting-tile"><div className="setting-icon blue"><Globe2 size={18}/></div><div><b>系统语言</b><span>界面显示与多语言文案</span></div><button onClick={() => notify(`当前语言：${language}，支持简体中文 / English`)}>{language}<ChevronDown size={13}/></button></div><div className="setting-tile"><div className="setting-icon green"><FileText size={18}/></div><div><b>单据编号规则</b><span>按业务类型自动生成流水号</span></div><button onClick={() => notify('编号规则：类型前缀 + 日期 + 六位流水')}>配置<ChevronRight size={13}/></button></div><div className="setting-tile"><div className="setting-icon purple"><ShieldCheck size={18}/></div><div><b>审批流程</b><span>按金额、仓库与单据类型路由</span></div><button onClick={() => notify('审批流设计器已就绪')}>管理<ChevronRight size={13}/></button></div><div className="setting-tile"><div className="setting-icon orange"><Activity size={18}/></div><div><b>操作审计</b><span>关键库存与权限变更留痕</span></div><button onClick={() => notify('最近 30 天审计日志已加载')}>查看日志<ChevronRight size={13}/></button></div></div>
}

function DynamicConfigPanel({ columns, onUpdateColumns, onSaveConfig, notify }: { columns: Record<string,string[]>; onUpdateColumns:(page:PageId,next:string[])=>void; onSaveConfig:(key:string,type:string,value:string)=>void; notify:(s:string)=>void }) {
  const inventoryColumns=['sku','skuName','warehouseCode','locationCode','lotNo','quantity','qualityStatus']
  return <div className="dynamic-config"><div><div className="dynamic-config-icon"><SlidersHorizontal size={19}/></div><div><b>表格视图设计器</b><span>按角色保存列显示、顺序、宽度和固定列；支持筛选与导出。当前视图已选 {columns.raw?.length||inventoryColumns.length} 列。</span></div><button className="secondary-button compact" onClick={() => { onUpdateColumns('raw',inventoryColumns); notify('已应用常用库存视图') }}>应用库存视图</button></div><div className="dynamic-preview"><span className="preview-label">表单设计器</span><div className="preview-form"><label>字段名称<div>供应商批次号 <span>必填</span></div></label><label>字段类型<div>文本 <ChevronDown size={13}/></div></label><label>校验规则<div>最大长度 40</div></label><button onClick={() => onSaveConfig('form.receiving','FORM',JSON.stringify({fields:[{name:'supplierLotNo',label:'供应商批次号',type:'text',required:true,maxLength:40}]}))}>保存字段</button></div><div className="preview-foot"><Check size={13}/> 表格与表单配置通过租户级配置接口保存</div></div></div>
}

function IntegrationPanel({ notify }: { notify: (s:string)=>void }) {
  const systems = [{ name:'SAP S/4HANA', tag:'ERP · MIGO', icon:BriefcaseBusiness, status:'运行中', tone:'green', time:'同步 2 分钟前', action:'管理接口' },{ name:'MES 制造执行',tag:'生产领退料',icon:Activity,status:'运行中',tone:'green',time:'同步 1 分钟前',action:'查看日志'},{ name:'TMS 运输平台',tag:'出库与发运',icon:Truck,status:'待配置',tone:'orange',time:'尚未建立连接',action:'配置接口' }]
  return <div className="integration-panel"><div className="integration-head"><div><b>已连接系统</b><span>通过标准 API 与 Webhook 对接外围业务系统</span></div><button className="secondary-button compact" onClick={() => notify('新建接口向导已打开')}><Plus size={15}/>添加接口</button></div><div className="integration-list">{systems.map(item => <div className="integration-row" key={item.name}><div className={`integration-icon ${item.tone}`}><item.icon size={18}/></div><div className="integration-name"><b>{item.name}</b><small>{item.tag}</small></div><span className={`integration-status ${item.tone}`}><i/>{item.status}</span><span className="integration-time">{item.time}</span><button onClick={() => notify(`${item.name}：${item.action}`)}>{item.action}<ChevronRight size={13}/></button></div>)}</div><div className="api-note"><FileCog size={16}/><span><b>接口文档与密钥管理</b><small>REST API · OpenAPI 3.0 · 幂等回调 · 签名校验</small></span><button onClick={() => window.open('http://localhost:8080/docs','_blank')}>查看 API 文档 <ArrowRight size={14}/></button></div></div>
}

function QualityPanel({ notify }: { notify:(s:string)=>void }) {
  return <div className="quality-strip"><div><span className="quality-ring">98.6%</span><span><b>来料一次合格率</b><small>近 30 天 · 较上期 <em>+1.2%</em></small></span></div><div><span className="quality-value">12 <small>批</small></span><span><b>待检批次</b><small>来料质检队列</small></span><button onClick={() => notify('已打开待检批次列表')}>开始检验 <ArrowRight size={13}/></button></div><div><span className="quality-value warning">3 <small>批</small></span><span><b>质量冻结</b><small>等待复核处理</small></span><button onClick={() => notify('质量冻结批次需完成复核与处置')}>处理异常 <ArrowRight size={13}/></button></div></div>
}

function DocumentModal({ page, warehouses, onClose, onSubmit }: { page: PageId; warehouses: WarehouseItem[]; onClose:()=>void; onSubmit:(form:Record<string,string>)=>void }) {
  const inferred: Record<PageId,string> = { receiving:'INBOUND', transfer:'TRANSFER', migo:'MIGO_IN', ga:'GA_OUT', count:'COUNT', other:'OTHER', finished:'INBOUND', line:'TRANSFER', raw:'OTHER', quality:'COUNT', dashboard:'INBOUND', approvals:'INBOUND', interfaces:'OTHER', forms:'OTHER', users:'OTHER', settings:'OTHER' }
  const [form,setForm]=useState({ docNo:'',docType:inferred[page],sourceWarehouse:page==='ga'||page==='migo'?'RM-01':'',sourceLocation:'',targetWarehouse:page==='receiving'||page==='finished'?'RM-01':'',targetLocation:'',businessPartner:'',sku:'MAT-1001',skuName:'冷轧钢板 1.2mm',lotNo:'',quantity:'1',uom:'kg' })
  const update=(key:string,value:string)=>setForm(current=>({...current,[key]:value}))
  const needsSource=['OUTBOUND','TRANSFER','MIGO_OUT','GA_OUT'].includes(form.docType); const needsTarget=['INBOUND','TRANSFER','MIGO_IN','RETURN_IN'].includes(form.docType)
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-card"><div className="modal-heading"><div><span className="modal-eyebrow">新建仓储业务</span><h2>创建单据</h2><p>填写单据主信息，保存后可提交审批。</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={e=>{e.preventDefault();onSubmit(form)}}><div className="modal-fields"><label>单据类型<select value={form.docType} onChange={e=>update('docType',e.target.value)}>{Object.entries(docTypeLabel).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label>单据编号<span className="optional">自动生成</span><input value={form.docNo} onChange={e=>update('docNo',e.target.value)} placeholder="留空自动生成"/></label>{needsSource&&<><label>来源仓库<select required value={form.sourceWarehouse} onChange={e=>update('sourceWarehouse',e.target.value)}><option value="">选择仓库</option>{warehouses.map(w=><option key={w.code}>{w.code}</option>)}</select></label><label>来源库位<input required value={form.sourceLocation} onChange={e=>update('sourceLocation',e.target.value)} placeholder="如 A-01-01"/></label></>}{needsTarget&&<><label>目标仓库<select required value={form.targetWarehouse} onChange={e=>update('targetWarehouse',e.target.value)}><option value="">选择仓库</option>{warehouses.map(w=><option key={w.code}>{w.code}</option>)}</select></label><label>目标库位<input required value={form.targetLocation} onChange={e=>update('targetLocation',e.target.value)} placeholder="如 A-01-01"/></label></>}<label>物料编码<input required value={form.sku} onChange={e=>update('sku',e.target.value)} /></label><label>物料名称<input required value={form.skuName} onChange={e=>update('skuName',e.target.value)} /></label><label>批次号<input value={form.lotNo} onChange={e=>update('lotNo',e.target.value)} placeholder="可后续补录"/></label><div className="quantity-field"><label>数量<input required min="0.0001" type="number" step="0.0001" value={form.quantity} onChange={e=>update('quantity',e.target.value)}/></label><label>单位<select value={form.uom} onChange={e=>update('uom',e.target.value)}><option>kg</option><option>pcs</option><option>箱</option><option>托</option><option>m</option></select></label></div><label className="span-two">往来单位 / 部门<input value={form.businessPartner} onChange={e=>update('businessPartner',e.target.value)} placeholder="供应商、客户或领料部门"/></label></div><div className="modal-tip"><ShieldCheck size={15}/> 提交审批后，由授权人员审核，通过后执行库存过账。</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button"><Plus size={15}/>保存草稿</button></div></form></div></div>
}

function QualityModal({ warehouses, onClose, onSubmit }: { warehouses:WarehouseItem[]; onClose:()=>void; onSubmit:(form:Record<string,string>)=>void }) {
  const [form,setForm]=useState({inspectionNo:'',sourceDocNo:'',inspectionType:'来料检验',warehouseCode:'QA-01',sku:'MAT-1014',skuName:'轴承 6204-ZZ',lotNo:'',inspectedQty:'1',remark:''})
  const update=(key:string,value:string)=>setForm(current=>({...current,[key]:value}))
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-card"><div className="modal-heading"><div><span className="modal-eyebrow">质量作业</span><h2>登记质检单</h2><p>登记待检批次，并在检验完成后判定放行、暂挂或冻结。</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={e=>{e.preventDefault();onSubmit(form)}}><div className="modal-fields"><label>检验类型<select value={form.inspectionType} onChange={e=>update('inspectionType',e.target.value)}><option>来料检验</option><option>过程检验</option><option>成品检验</option><option>退货检验</option></select></label><label>质检单号<span className="optional">自动生成</span><input value={form.inspectionNo} onChange={e=>update('inspectionNo',e.target.value)} placeholder="留空自动生成"/></label><label>检验仓库<select required value={form.warehouseCode} onChange={e=>update('warehouseCode',e.target.value)}>{warehouses.map(w=><option value={w.code} key={w.code}>{w.code} · {w.name}</option>)}</select></label><label>来源单号<input value={form.sourceDocNo} onChange={e=>update('sourceDocNo',e.target.value)} placeholder="ASN 或生产单号"/></label><label>物料编码<input required value={form.sku} onChange={e=>update('sku',e.target.value)}/></label><label>物料名称<input required value={form.skuName} onChange={e=>update('skuName',e.target.value)}/></label><label>批次号<input required value={form.lotNo} onChange={e=>update('lotNo',e.target.value)} placeholder="输入待检批次"/></label><label>检验数量<input required min="0.0001" step="0.0001" type="number" value={form.inspectedQty} onChange={e=>update('inspectedQty',e.target.value)}/></label><label className="span-two">检验说明<input value={form.remark} onChange={e=>update('remark',e.target.value)} placeholder="可填写抽样方案或检验标准"/></label></div><div className="modal-tip"><ShieldCheck size={15}/> 检验结果会更新对应仓库中该物料批次的质量状态。</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button"><Plus size={15}/>创建待检记录</button></div></form></div></div>
}

function UserModal({ onClose, onSubmit }: { onClose:()=>void; onSubmit:(form:Record<string,string>)=>void }) {
  const [form,setForm]=useState({username:'',displayName:'',password:'',roleCode:'operator',warehouseScope:''})
  const update=(key:string,value:string)=>setForm(current=>({...current,[key]:value}))
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-card"><div className="modal-heading"><div><span className="modal-eyebrow">组织与安全</span><h2>添加用户</h2><p>选择角色模板后，可按仓库限制其数据可见范围。</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={e=>{e.preventDefault();onSubmit(form)}}><div className="modal-fields"><label>用户名<input required value={form.username} onChange={e=>update('username',e.target.value)} placeholder="用于登录的唯一账号"/></label><label>姓名<input required value={form.displayName} onChange={e=>update('displayName',e.target.value)} placeholder="员工姓名"/></label><label>初始密码<input required minLength={8} type="password" value={form.password} onChange={e=>update('password',e.target.value)} placeholder="至少 8 位"/></label><label>角色模板<select value={form.roleCode} onChange={e=>update('roleCode',e.target.value)}><option value="operator">仓库作业员</option><option value="warehouse_manager">仓库主管</option><option value="quality_inspector">质检员</option><option value="tenant_admin">租户管理员</option></select></label><label className="span-two">仓库数据范围<input value={form.warehouseScope} onChange={e=>update('warehouseScope',e.target.value)} placeholder="留空为全部仓库；多个仓库用逗号分隔，如 RM-01,LINE-01"/></label></div><div className="modal-tip"><ShieldCheck size={15}/> 系统将按角色模板分配功能权限，仓库数据范围会在服务端强制校验。</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button"><Plus size={15}/>创建用户</button></div></form></div></div>
}

function UserAccessModal({ user, onClose, onSubmit }: { user:Row; onClose:()=>void; onSubmit:(form:Record<string,string>)=>void }) {
  const [form,setForm]=useState({roleCode:String(user.roleCode||'operator'),warehouseScope:String(user.warehouseScopeRaw||'')==='ALL'?'':String(user.warehouseScopeRaw||''),enabled:String(user.enabled!==false)})
  const update=(key:string,value:string)=>setForm(current=>({...current,[key]:value}))
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal-card"><div className="modal-heading"><div><span className="modal-eyebrow">权限与数据范围</span><h2>设置 {String(user.displayName||user.username)} 的访问权限</h2><p>功能权限由角色模板控制，仓库数据范围在每次 API 请求时强制校验。</p></div><button className="icon-button" onClick={onClose}><X size={19}/></button></div><form onSubmit={e=>{e.preventDefault();onSubmit(form)}}><div className="modal-fields"><label>角色模板<select value={form.roleCode} onChange={e=>update('roleCode',e.target.value)}><option value="operator">仓库作业员</option><option value="warehouse_manager">仓库主管</option><option value="quality_inspector">质检员</option><option value="tenant_admin">租户管理员</option></select></label><label>用户状态<select value={form.enabled} onChange={e=>update('enabled',e.target.value)}><option value="true">正常</option><option value="false">已停用</option></select></label><label className="span-two">仓库数据范围<input value={form.warehouseScope} onChange={e=>update('warehouseScope',e.target.value)} placeholder="留空为全部仓库；多个仓库用逗号分隔，如 RM-01,LINE-01"/></label><div className="span-two access-permissions"><b>此角色包含的权限</b><span>{(rolePermissions[form.roleCode]||[]).join(' · ')}</span></div></div><div className="modal-tip"><ShieldCheck size={15}/> 保存后会更新用户下一次登录签发的权限范围。</div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button"><Check size={15}/>保存权限</button></div></form></div></div>
}

function DetailDrawer({ row, onClose, onAction, onQualityAction, can }: { row: Row; onClose:()=>void; onAction:(action:'SUBMIT'|'APPROVE'|'REJECT'|'COMPLETE'|'CANCEL')=>void; onQualityAction:(result:'PASS'|'HOLD'|'REJECT')=>void; can:(permission:string)=>boolean }) {
  const status=String(row.status||''); const quality = 'inspectionNo' in row; const doc = 'docNo' in row
  return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="detail-drawer"><div className="drawer-top"><span>记录详情</span><button className="icon-button" onClick={onClose}><X size={18}/></button></div><div className="drawer-title"><span className="drawer-icon"><FileText size={19}/></span><div><h2>{String(row.docNo||row.inspectionNo||row.skuName||row.name||'记录详情')}</h2><span>{doc?docTypeLabel[String(row.docType)]||row.docType:quality?String(row.docType||'质量检验'):'仓储主数据'}</span></div></div><StatusPill value={quality?(status==='PENDING'?'待检':status):status}/><div className="detail-list">{Object.entries(row).filter(([k])=>!['id','status'].includes(k)).map(([key,value])=><div key={key}><span>{fieldLabel(key)}</span><b>{formatValue(key,value)}</b></div>)}</div>{doc&&<><div className="drawer-section-title">处理节点</div><div className="timeline"><div className="timeline-item done"><i/><span><b>单据创建</b><small>{String(row.createdBy||'仓储管理员')} · {dateLabel(String(row.createdAt||''))}</small></span></div><div className={`timeline-item ${status==='PENDING_APPROVAL'||status==='APPROVED'||status==='COMPLETED'?'done':''}`}><i/><span><b>审批处理</b><small>{status==='PENDING_APPROVAL'?'等待审批人处理':'单据审批节点'}</small></span></div><div className={`timeline-item ${status==='COMPLETED'?'done':''}`}><i/><span><b>库存过账</b><small>{status==='COMPLETED'?'库存流水已更新':'审批通过后执行'}</small></span></div></div><div className="drawer-actions">{status==='DRAFT'&&can('document:submit')&&<button className="primary-button" onClick={()=>onAction('SUBMIT')}>提交审批</button>}{status==='PENDING_APPROVAL'&&can('approval:decide')&&<><button className="secondary-button reject-button" onClick={()=>onAction('REJECT')}>驳回</button><button className="primary-button" onClick={()=>onAction('APPROVE')}><Check size={15}/>审批通过</button></>}{status==='APPROVED'&&can('document:post')&&<button className="primary-button" onClick={()=>onAction('COMPLETE')}><Check size={15}/>执行库存过账</button>}</div></>}{quality&&status==='PENDING'&&can('quality:decide')&&<div className="drawer-actions"><button className="secondary-button reject-button" onClick={()=>onQualityAction('REJECT')}>判定不合格</button><button className="secondary-button" onClick={()=>onQualityAction('HOLD')}>暂挂复核</button><button className="primary-button" onClick={()=>onQualityAction('PASS')}><Check size={15}/>检验放行</button></div>}</aside></div>
}

function getRows(page:PageId,inventory:InventoryItem[],documents:StockDocument[],warehouses:WarehouseItem[],quality:QualityInspection[],users:Row[]):Row[]{
  if(['raw','finished','line'].includes(page)){
    const code=page==='raw'?'RM-01':page==='finished'?'FG-01':'LINE-01'
    return inventory.filter(i=>i.warehouseCode===code).map(i=>({id:i.id,sku:i.sku,skuName:i.skuName,warehouseCode:i.warehouseCode,locationCode:i.locationCode,lotNo:i.lotNo,quantity:i.quantity,uom:i.uom,qualityStatus:i.qualityStatus,updatedAt:i.updatedAt}))
  }
  if(page==='users')return users
  if(page==='settings')return [{id:1,setting:'系统语言',value:'简体中文 / English',scope:'租户级',updatedAt:'2026-10-13 09:00'},{id:2,setting:'单据编号规则',value:'类型 + 日期 + 流水号',scope:'按单据类型',updatedAt:'2026-10-12 16:22'},{id:3,setting:'库存策略',value:'批次先进先出 · 负库存禁止',scope:'仓库级',updatedAt:'2026-10-10 14:32'}]
  if(page==='forms')return [{id:1,setting:'采购收货单',value:'16 字段 · 3 个自定义字段',scope:'采购仓储',updatedAt:'2026-10-13 09:00'},{id:2,setting:'库存盘点表',value:'12 字段 · 盘点差异需复核',scope:'库存作业',updatedAt:'2026-10-12 16:22'},{id:3,setting:'库存查询表格',value:'7 列 · 按角色保存视图',scope:'库存查询',updatedAt:'2026-10-10 14:32'}]
  if(page==='interfaces')return [{id:1,setting:'SAP S/4HANA · MIGO',value:'收货 / 发料 / 库存同步',scope:'运行中',updatedAt:'2026-10-13 10:22'},{id:2,setting:'MES 制造执行',value:'生产领料 / 退料',scope:'运行中',updatedAt:'2026-10-13 10:23'},{id:3,setting:'TMS 运输平台',value:'出库与发运回传',scope:'待配置',updatedAt:'—'}]
  if(page==='quality')return quality.map(q=>({id:q.id,inspectionNo:q.inspectionNo,sourceDocNo:q.sourceDocNo||'—',docType:q.inspectionType,status:q.status,sku:q.sku,skuName:q.skuName,lotNo:q.lotNo,warehouseCode:q.warehouseCode,qualityStatus:q.status==='PASS'?'合格':q.status==='REJECTED'?'冻结':q.status==='HOLD'?'待检':'待检',quantity:q.inspectedQty,uom:'pcs',inspector:q.inspector||'—',createdAt:q.createdAt,remark:q.remark||'—'}))
  return documents.map(d=>documentToRow(d))
}
function documentToRow(d:StockDocument):Row{return {id:d.id,docNo:d.docNo,docType:d.docType,status:d.status,sourceWarehouse:d.sourceWarehouse||'—',targetWarehouse:d.targetWarehouse||'—',sku:d.sku,skuName:d.skuName,lotNo:d.lotNo||'—',quantity:d.quantity,uom:d.uom,businessPartner:d.businessPartner||'—',createdBy:d.createdBy||'—',createdAt:d.createdAt}}
function getColumns(page:PageId):{key:string;label:string}[]{
  if(['raw','finished','line'].includes(page))return [{key:'sku',label:'物料编码'},{key:'skuName',label:'物料名称'},{key:'warehouseCode',label:'仓库'},{key:'locationCode',label:'库位'},{key:'lotNo',label:'批次号'},{key:'quantity',label:'现有库存'},{key:'qualityStatus',label:'质量状态'},{key:'updatedAt',label:'更新时间'}]
  if(page==='users')return [{key:'username',label:'用户名'},{key:'displayName',label:'姓名'},{key:'role',label:'角色'},{key:'warehouseScope',label:'数据范围'},{key:'permissions',label:'功能权限'},{key:'status',label:'状态'},{key:'updatedAt',label:'最近更新'}]
  if(['settings','forms','interfaces'].includes(page))return [{key:'setting',label:'配置项'},{key:'value',label:'配置内容'},{key:'scope',label:'作用范围'},{key:'updatedAt',label:'最近更新'}]
  if(page==='quality')return [{key:'inspectionNo',label:'质检单号'},{key:'docType',label:'检验类型'},{key:'sku',label:'物料编码'},{key:'skuName',label:'物料名称'},{key:'lotNo',label:'批次号'},{key:'warehouseCode',label:'仓库'},{key:'qualityStatus',label:'检验状态'},{key:'createdAt',label:'创建时间'}]
  return [{key:'docNo',label:'单据编号'},{key:'docType',label:'单据类型'},{key:'sourceWarehouse',label:'来源仓库'},{key:'targetWarehouse',label:'目标仓库'},{key:'sku',label:'物料编码'},{key:'skuName',label:'物料名称'},{key:'quantity',label:'数量'},{key:'status',label:'单据状态'},{key:'createdAt',label:'创建时间'}]
}
function renderCell(key:string,value:Row[string],language='简体中文'){if(key==='status'||key==='qualityStatus')return <StatusPill value={String(value??'')} language={language}/>;if(key==='quantity')return <span className="quantity-cell">{fmtNumber(Number(value||0))}</span>;if(key==='docNo'||key==='inspectionNo'||key==='sku')return <b className="code-cell">{String(value??'—')}</b>;if(key==='createdAt'||key==='updatedAt')return <span className="muted-cell">{value?dateLabel(String(value)): '—'}</span>;if(key==='docType')return language==='English'?englishLabels[docTypeLabel[String(value)]]||String(value??'—'):docTypeLabel[String(value)]||String(value??'—');return String(value??'—')}
function StatusPill({value,language='简体中文'}:{value:string;language?:string}){const tone=['COMPLETED','APPROVED','合格','PASS','正常'].includes(value)?'success':['PENDING','PENDING_APPROVAL','待检','HOLD'].includes(value)?'warning':['REJECTED','冻结','FAIL'].includes(value)?'danger':value==='CANCELLED'?'muted':'neutral';return <span className={`status-pill ${tone}`}><i/>{tr(statusLabel[value]||value||'—',language)}</span>}
function EmptyState({query}:{query:string}){return <div className="empty-state"><div><ListFilter size={19}/></div><b>{query?'没有找到匹配记录':'暂无数据'}</b><span>{query?'试试更短的关键词或清除筛选。':'该模块的数据会在新增业务后显示。'}</span></div>}
function panelTitle(page:PageId){if(['raw','finished','line'].includes(page))return '库存明细';if(page==='approvals')return '待我审批';if(page==='quality')return '质检与异常记录';if(page==='users')return '租户用户';if(page==='forms')return '配置列表';if(page==='interfaces')return '接口运行日志';if(page==='settings')return '租户配置';if(page==='receiving')return '收货单据';if(page==='count')return '盘点任务';if(page==='transfer')return '调拨单据';if(page==='migo')return 'MIGO 物料凭证';if(page==='ga')return 'GA 出库单据';if(page==='other')return '其他仓储单据';return '业务单据'}
function fieldLabel(key:string){const labels:Record<string,string>={docNo:'单据编号',inspectionNo:'质检单号',inspectionType:'检验类型',sourceDocNo:'来源单据',status:'当前状态',sourceWarehouse:'来源仓库',targetWarehouse:'目标仓库',sourceLocation:'来源库位',targetLocation:'目标库位',businessPartner:'往来单位',sku:'物料编码',skuName:'物料名称',lotNo:'批次号',quantity:'数量',inspectedQty:'检验数量',acceptedQty:'合格数量',rejectedQty:'不合格数量',uom:'单位',createdBy:'创建人',inspector:'检验人',createdAt:'创建时间',warehouseCode:'仓库编码',locationCode:'库位',qualityStatus:'质量状态',updatedAt:'更新时间',name:'名称',value:'配置内容',setting:'配置项',scope:'作用范围',role:'角色',permissions:'功能权限',username:'用户名',displayName:'姓名',remark:'备注'};return labels[key]||key}
function formatValue(key:string,value:Row[string]){if(key==='docType')return docTypeLabel[String(value)]||String(value);if(key==='status'||key==='qualityStatus')return statusLabel[String(value)]||String(value);if(key==='createdAt'||key==='updatedAt')return dateLabel(String(value));if(key==='quantity')return `${fmtNumber(Number(value))}`;return String(value??'—')}
