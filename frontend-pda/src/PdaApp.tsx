import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpFromLine, Barcode, Boxes, Camera,
  Check, CheckCircle2, ClipboardCheck, ClipboardList, Factory, FileText, LogOut, Package,
  PackageCheck, RefreshCw, Search, ShieldCheck, Trash2, Truck, Warehouse, X,
  type LucideIcon,
} from 'lucide-react'
import { api, InventoryItem, QualityInspection, Session, signIn as signInRequest, StockDocument, WarehouseItem } from './api'

type OpKind = 'movement' | 'query' | 'quality' | 'barcode'
type Operation = {
  id: string; title: string; description: string; icon: LucideIcon; kind: OpKind
  docType?: string; source?: boolean; target?: boolean; permission?: string
}
type ScanLine = { key: string; sku: string; skuName: string; lotNo: string; quantity: number; uom: string; available?: number }
type Screen = 'home' | 'operation' | 'tasks' | 'inventory' | 'quality' | 'profile'

const operationGroups: { title: string; icon: LucideIcon; operations: Operation[] }[] = [
  { title: '采购收货', icon: ArrowDownToLine, operations: [
    { id: 'po-receive', title: '采购收货', description: '采购订单与到货扫码收货', icon: ArrowDownToLine, kind: 'movement', docType: 'INBOUND', target: true },
    { id: 'asn-receive', title: '送货单收货', description: '按供应商送货单收货', icon: ClipboardList, kind: 'movement', docType: 'INBOUND', target: true },
    { id: 'quality', title: '质检放行', description: '登记来料检验并判定结果', icon: ShieldCheck, kind: 'quality', permission: 'quality:inspect' },
    { id: 'putaway', title: '库存上架', description: '从暂存位扫描转入目标货位', icon: Warehouse, kind: 'movement', docType: 'TRANSFER', source: true, target: true },
    { id: 'supplier-return', title: '采购退货', description: '扫描退货物料并登记出库', icon: ArrowUpFromLine, kind: 'movement', docType: 'OUTBOUND', source: true },
    { id: 'label-compare', title: '条码比对', description: '逐一扫描并检查本次标签清单', icon: Barcode, kind: 'barcode', permission: 'inventory:read' },
  ] },
  { title: '生产领料', icon: Factory, operations: [
    { id: 'material-pick', title: '领料拣配', description: '按工单拣料并登记发料', icon: Package, kind: 'movement', docType: 'OUTBOUND', source: true },
    { id: 'material-return', title: '退料入库', description: '生产余料退回仓库', icon: ArrowDownToLine, kind: 'movement', docType: 'RETURN_IN', target: true },
    { id: 'outsourcing-issue', title: '委外出库', description: '委外加工物料出库', icon: Truck, kind: 'movement', docType: 'OUTBOUND', source: true },
    { id: 'outsourcing-return', title: '委外退库', description: '委外加工余料退库', icon: ArrowDownToLine, kind: 'movement', docType: 'RETURN_IN', target: true },
  ] },
  { title: '成品入库', icon: PackageCheck, operations: [
    { id: 'production-receipt', title: '生产入库', description: '完工成品扫码入库', icon: PackageCheck, kind: 'movement', docType: 'INBOUND', target: true },
    { id: 'finished-return', title: '成品返线', description: '成品退回生产线', icon: ArrowLeftRight, kind: 'movement', docType: 'TRANSFER', source: true, target: true },
    { id: 'finished-pick', title: '成品领料', description: '成品仓发料与物料校验', icon: ArrowUpFromLine, kind: 'movement', docType: 'OUTBOUND', source: true },
  ] },
  { title: '销售拣配', icon: Truck, operations: [
    { id: 'sales-pick', title: '销售拣配', description: '按销售单扫描拣货', icon: Package, kind: 'movement', docType: 'OUTBOUND', source: true },
    { id: 'sales-return', title: '销售退库', description: '销售退货扫码入库', icon: ArrowDownToLine, kind: 'movement', docType: 'RETURN_IN', target: true },
    { id: 'load-check', title: '装车比对', description: '扫描装车标签形成核对清单', icon: CheckCircle2, kind: 'barcode', permission: 'inventory:read' },
  ] },
  { title: '库存管理', icon: Boxes, operations: [
    { id: 'inventory-query', title: '库存查询', description: '扫描物料、批次或输入货位查询', icon: Search, kind: 'query', permission: 'inventory:read' },
    { id: 'bin-transfer', title: '库位转移', description: '扫描来源位与目标位后调拨', icon: ArrowLeftRight, kind: 'movement', docType: 'TRANSFER', source: true, target: true },
    { id: 'stock-count', title: '库存盘点', description: '扫描物料累计实盘数并提交', icon: ClipboardCheck, kind: 'movement', docType: 'COUNT', source: true },
    { id: 'scrap', title: '报废出库', description: '登记报废物料并提交出库', icon: Trash2, kind: 'movement', docType: 'OUTBOUND', source: true },
  ] },
  { title: '客供料管理', icon: Boxes, operations: [
    { id: 'customer-receive', title: '客供料收货', description: '登记客户供料并扫描批次', icon: ArrowDownToLine, kind: 'movement', docType: 'INBOUND', target: true },
    { id: 'customer-issue', title: '客供料发出', description: '客供物料按需发料', icon: ArrowUpFromLine, kind: 'movement', docType: 'OUTBOUND', source: true },
    { id: 'customer-return', title: '客供料退回', description: '不良或余料退还客户', icon: Truck, kind: 'movement', docType: 'OUTBOUND', source: true },
  ] },
  { title: '盘点巡检', icon: ClipboardCheck, operations: [
    { id: 'cycle-count', title: '循环盘点', description: '按仓库、库位和批次校准库存', icon: ClipboardCheck, kind: 'movement', docType: 'COUNT', source: true },
    { id: 'warehouse-check', title: '库房巡检', description: '扫描库位与物料建立巡检清单', icon: ClipboardList, kind: 'barcode', permission: 'inventory:read' },
  ] },
]

const demoWarehouses: WarehouseItem[] = [
  { code: 'RM-01', name: '原材料中心仓', type: '原材料仓' }, { code: 'FG-01', name: '成品总仓', type: '成品仓' },
  { code: 'LINE-01', name: '一号线边仓', type: '线边仓' }, { code: 'QA-01', name: '待检与不合格品区', type: '质量仓' },
]
const demoInventory: InventoryItem[] = [
  { id: 1, warehouseCode: 'RM-01', locationCode: 'A-01-01', sku: 'MAT-1001', skuName: '冷轧钢板 1.2mm', lotNo: 'LOT-260930-01', quantity: 2400, uom: 'kg', qualityStatus: '合格', updatedAt: new Date().toISOString() },
  { id: 2, warehouseCode: 'RM-01', locationCode: 'A-01-02', sku: 'MAT-1002', skuName: '铝型材 6061-T6', lotNo: 'LOT-261001-03', quantity: 860, uom: 'kg', qualityStatus: '合格', updatedAt: new Date().toISOString() },
  { id: 3, warehouseCode: 'FG-01', locationCode: 'F-02-01', sku: 'FG-2001', skuName: '智能控制器 V3', lotNo: 'LOT-261010-02', quantity: 320, uom: 'pcs', qualityStatus: '合格', updatedAt: new Date().toISOString() },
]
const demoDocuments: StockDocument[] = [
  { id: 1, docNo: 'ASN-20261014-0021', docType: 'INBOUND', status: 'PENDING_APPROVAL', targetWarehouse: 'RM-01', targetLocation: 'A-01-01', sku: 'MAT-1001', skuName: '冷轧钢板 1.2mm', lotNo: 'LOT-261014-01', quantity: 120, uom: 'kg', createdAt: new Date().toISOString() },
  { id: 2, docNo: 'DO-20261014-0008', docType: 'OUTBOUND', status: 'APPROVED', sourceWarehouse: 'FG-01', sourceLocation: 'F-02-01', sku: 'FG-2001', skuName: '智能控制器 V3', lotNo: 'LOT-261010-02', quantity: 12, uom: 'pcs', createdAt: new Date().toISOString() },
]

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1'
const docTypeName: Record<string, string> = { INBOUND: '入库', OUTBOUND: '出库', TRANSFER: '调拨', COUNT: '盘点', RETURN_IN: '退货入库', MIGO_IN: 'MIGO 入库', MIGO_OUT: 'MIGO 发料', GA_OUT: 'GA 领用', OTHER: '其他' }
const statusName: Record<string, string> = { DRAFT: '草稿', PENDING_APPROVAL: '待审批', APPROVED: '待过账', COMPLETED: '已完成', REJECTED: '已驳回', CANCELLED: '已取消' }
const canDo = (session: Session, permission: string) => session.offline || session.user.permissions.includes('*') || session.user.permissions.includes(permission)
const safeSession = (): Session | null => { try { return JSON.parse(localStorage.getItem('easywms:pda-session') || 'null') } catch { return null } }

export default function PdaApp() {
  const [session, setSession] = useState<Session | null>(safeSession)
  const initialOffline = session?.offline === true
  const [screen, setScreen] = useState<Screen>('home')
  const [currentOp, setCurrentOp] = useState<Operation | null>(null)
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>(initialOffline ? demoWarehouses : [])
  const [inventory, setInventory] = useState<InventoryItem[]>(initialOffline ? demoInventory : [])
  const [documents, setDocuments] = useState<StockDocument[]>(initialOffline ? demoDocuments : [])
  const [inspections, setInspections] = useState<QualityInspection[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [login, setLogin] = useState({ tenantId: '1001', username: 'admin', password: 'admin123' })
  const [loginError, setLoginError] = useState('')
  const [toast, setToast] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [scanText, setScanText] = useState('')
  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<ScanLine[]>([])
  const [scanCodes, setScanCodes] = useState<string[]>([])
  const [sourceWarehouse, setSourceWarehouse] = useState('')
  const [sourceLocation, setSourceLocation] = useState('')
  const [targetWarehouse, setTargetWarehouse] = useState('')
  const [targetLocation, setTargetLocation] = useState('')
  const [businessPartner, setBusinessPartner] = useState('')
  const [qualityResult, setQualityResult] = useState('PASS')
  const [submitting, setSubmitting] = useState(false)
  const [taskFilter, setTaskFilter] = useState('全部')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [scanHistory, setScanHistory] = useState<string[]>([])
  const scanInput = useRef<HTMLInputElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const scanHandler = useRef<(code: string) => void>(() => {})

  const notify = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800) }, [])
  const refresh = useCallback(async (active: Session) => {
    if (active.offline) { setWarehouses(demoWarehouses); setInventory(demoInventory); setDocuments(demoDocuments); return }
    setLoadingData(true)
    const warehouseRequest: Promise<WarehouseItem[]> = canDo(active, 'warehouse:read') ? api.warehouses(active.accessToken) : Promise.resolve([])
    const inventoryRequest: Promise<InventoryItem[]> = canDo(active, 'inventory:read') ? api.inventory(active.accessToken) : Promise.resolve([])
    const documentRequest: Promise<StockDocument[]> = canDo(active, 'document:read') ? api.documents(active.accessToken) : Promise.resolve([])
    const qualityRequest: Promise<QualityInspection[]> = canDo(active, 'quality:read') ? api.quality(active.accessToken) : Promise.resolve([])
    const requests = await Promise.allSettled([warehouseRequest, inventoryRequest, documentRequest, qualityRequest] as const)
    if (requests[0].status === 'fulfilled') setWarehouses(requests[0].value)
    if (requests[1].status === 'fulfilled') setInventory(requests[1].value)
    if (requests[2].status === 'fulfilled') setDocuments(requests[2].value)
    if (requests[3].status === 'fulfilled') setInspections(requests[3].value)
    const failed = requests.find(result => result.status === 'rejected')
    if (failed?.status === 'rejected') notify(failed.reason instanceof Error ? failed.reason.message : '同步 WMS 数据失败')
    setLoadingData(false)
  }, [notify])

  useEffect(() => {
    if (session) void refresh(session)
  }, [session?.accessToken, session?.offline, refresh])
  useEffect(() => {
    const onlineHandler = () => setOnline(true), offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler); window.addEventListener('offline', offlineHandler)
    return () => { window.removeEventListener('online', onlineHandler); window.removeEventListener('offline', offlineHandler) }
  }, [])
  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    const ssoError = new URLSearchParams(window.location.search).get('sso_error')
    if (!token) { if (ssoError) setLoginError('该企业账号尚未开通 EasyWMS，请联系租户管理员。'); return }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    void api.currentUser(token).then(user => {
      const active: Session = { accessToken: token, user, offline: false }
      localStorage.setItem('easywms:pda-session', JSON.stringify(active)); setSession(active); notify('企业单点登录成功')
    }).catch(error => setLoginError(error instanceof Error ? error.message : '单点登录验证失败'))
  }, [notify])
  useEffect(() => { if (cameraStream && video.current) video.current.srcObject = cameraStream }, [cameraStream])
  useEffect(() => {
    if (!cameraOpen || !cameraStream) return
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (...args: any[]) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector
    if (!BarcodeDetectorCtor) { setCameraError('当前浏览器没有相机扫码 API；请使用 PDA 扫描头、USB 扫描枪或手动输入。'); return }
    let active = true
    const detector = new BarcodeDetectorCtor()
    let timer = 0
    const poll = async () => {
      if (!active) return
      try {
        if (video.current?.readyState === 4) {
          const result = await detector.detect(video.current)
          if (result[0]?.rawValue) { scanHandler.current(result[0].rawValue); stopCamera() ; return }
        }
      } catch { /* keep polling while the camera is active */ }
      timer = window.setTimeout(poll, 300)
    }
    void poll()
    return () => { active = false; window.clearTimeout(timer) }
  }, [cameraOpen, cameraStream])

  const allowedOperations = useMemo(() => operationGroups.map(group => ({
    ...group, operations: group.operations.filter(op => !op.permission || (session && canDo(session, op.permission)))
      .filter(op => op.kind === 'query' || op.kind === 'barcode' || (session && canDo(session, op.kind === 'quality' ? 'quality:inspect' : 'document:create'))),
  })).filter(group => group.operations.length), [session])
  const pendingCount = documents.filter(document => ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(document.status)).length + inspections.filter(inspection => inspection.status === 'PENDING').length

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault(); setLoginError('')
    try {
      const active = await signInRequest(login.tenantId, login.username, login.password)
      localStorage.setItem('easywms:pda-session', JSON.stringify(active)); setSession(active); setScreen('home')
    } catch (error) { setLoginError(error instanceof Error ? error.message : '登录失败') }
  }

  const startSso = async () => {
    try {
      const config = await api.ssoConfig()
      if (!config.enabled) { setLoginError('服务端尚未启用企业单点登录'); return }
      window.location.href = `${new URL(apiBase, window.location.origin).origin}/api/v1/auth/sso/start?client=pda`
    } catch (error) { setLoginError(error instanceof Error ? error.message : '读取单点登录配置失败') }
  }

  const openOperation = (operation: Operation) => {
    setCurrentOp(operation); setLines([]); setScanCodes([]); setScanHistory([]); setScanText(''); setQuery(''); setBusinessPartner('')
    const first = warehouses[0]?.code || 'RM-01', second = warehouses[1]?.code || first
    const qualityWarehouse = warehouses.find(item => item.code === 'QA-01')?.code || first
    setSourceWarehouse(first); setTargetWarehouse(operation.kind === 'quality' ? qualityWarehouse : operation.docType === 'TRANSFER' ? second : first)
    const sourceBin = inventory.find(item => item.warehouseCode === first)?.locationCode || ''
    const targetWarehouse = operation.kind === 'quality' ? qualityWarehouse : operation.docType === 'TRANSFER' ? second : first
    const targetBin = inventory.find(item => item.warehouseCode === targetWarehouse)?.locationCode || ''
    setSourceLocation(sourceBin); setTargetLocation(targetBin); setScreen('operation')
    window.setTimeout(() => scanInput.current?.focus(), 100)
  }

  const handleScan = useCallback((rawCode: string) => {
    const code = rawCode.trim()
    if (!code || !currentOp) return
    setScanText(''); setScanHistory(old => [code, ...old].slice(0, 8)); navigator.vibrate?.(25)
    if (currentOp.kind === 'query') { setQuery(code); return }
    if (currentOp.kind === 'barcode') { setScanCodes(old => [...old, code]); return }
    const existing = inventory.find(item => item.sku.toLowerCase() === code.toLowerCase() || item.lotNo.toLowerCase() === code.toLowerCase() || `${item.sku}-${item.lotNo}`.toLowerCase() === code.toLowerCase())
    const fields = Object.fromEntries(code.split(/[|;,]/).map(part => part.split(/[:=]/, 2)).filter(pair => pair.length === 2).map(([key, value]) => [key.trim().toUpperCase(), value.trim()] as const))
    const sku = existing?.sku || fields.SKU || fields.MATNR || code
    const lotNo = existing?.lotNo || fields.LOT || fields.BATCH || ''
    const encodedQuantity = fields.QTY ?? fields.QUANTITY
    const quantity = encodedQuantity === undefined ? 1 : Number(encodedQuantity)
    const validQuantity = Number.isFinite(quantity) && (currentOp.docType === 'COUNT' ? quantity >= 0 : quantity > 0)
    setLines(old => {
      const index = old.findIndex(line => line.sku === sku && line.lotNo === lotNo)
      if (index >= 0) return old.map((line, i) => i === index ? { ...line, quantity: line.quantity + (validQuantity ? quantity : 1) } : line)
      return [...old, { key: `${Date.now()}-${Math.random()}`, sku, skuName: existing?.skuName || fields.NAME || '', lotNo, quantity: validQuantity ? quantity : 1, uom: existing?.uom || fields.UOM || 'pcs', available: existing?.quantity }]
    })
    if (!existing && !fields.NAME) notify(`已加入条码 ${sku}；可在清单中补充物料名称`)
  }, [currentOp, inventory, notify])
  useEffect(() => { scanHandler.current = handleScan }, [handleScan])

  const startCamera = async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('此设备不支持浏览器相机访问，请使用 PDA 扫描头或手动输入。'); setCameraOpen(true); return }
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false }); setCameraStream(stream); setCameraOpen(true) }
    catch { setCameraError('无法开启相机。请在 HTTPS 页面中授权摄像头，或使用设备扫描头。'); setCameraOpen(true) }
  }
  const stopCamera = () => { cameraStream?.getTracks().forEach(track => track.stop()); setCameraStream(null); setCameraOpen(false) }

  const updateLine = (key: string, patch: Partial<ScanLine>) => setLines(old => old.map(line => line.key === key ? { ...line, ...patch } : line))
  const removeLine = (key: string) => setLines(old => old.filter(line => line.key !== key))

  const saveOperation = async () => {
    if (!session || !currentOp) return
    if (currentOp.kind === 'query') { setScreen('inventory'); return }
    if (currentOp.kind === 'barcode') { notify(`已完成 ${scanCodes.length} 个条码的本次核对`); setScreen('tasks'); return }
    if (!lines.length) { notify('请先扫描或添加物料'); scanInput.current?.focus(); return }
    if ((currentOp.source && !sourceWarehouse) || ((currentOp.target || currentOp.kind === 'quality') && !targetWarehouse)) { notify('请先选择仓库'); return }
    if ((currentOp.source && !sourceLocation) || (currentOp.target && !targetLocation)) { notify('请先选择或扫描库位'); return }
    if (lines.some(line => !line.sku || !line.skuName || !Number.isFinite(line.quantity) || (currentOp.docType === 'COUNT' ? line.quantity < 0 : line.quantity <= 0))) { notify('请完善物料名称与有效数量'); return }
    setSubmitting(true)
    try {
      for (const line of lines) {
        if (currentOp.kind === 'quality') {
          if (session.offline) {
            const saved: QualityInspection = { id: Date.now(), inspectionNo: `IQC-PDA-${Date.now()}`, inspectionType: currentOp.title, warehouseCode: targetWarehouse || sourceWarehouse, sku: line.sku, skuName: line.skuName, lotNo: line.lotNo || 'UNASSIGNED', inspectedQty: line.quantity, status: canDo(session, 'quality:decide') ? qualityResult === 'REJECT' ? 'REJECTED' : qualityResult : 'PENDING', createdAt: new Date().toISOString() }
            setInspections(old => [saved, ...old]); continue
          }
          let saved = await api.createQuality(session.accessToken, { inspectionType: currentOp.title, warehouseCode: targetWarehouse || sourceWarehouse, sku: line.sku, skuName: line.skuName, lotNo: line.lotNo || 'UNASSIGNED', inspectedQty: line.quantity, remark: businessPartner || undefined })
          if (canDo(session, 'quality:decide') && saved.id) saved = await api.decideQuality(session.accessToken, saved.id, qualityResult)
          setInspections(old => [saved, ...old.filter(item => item.id !== saved.id)])
        } else {
          const payload = {
            docType: currentOp.docType || 'OTHER', sourceWarehouse: currentOp.source ? sourceWarehouse : undefined,
            sourceLocation: currentOp.source ? sourceLocation : undefined, targetWarehouse: currentOp.target ? targetWarehouse : undefined,
            targetLocation: currentOp.target ? targetLocation : undefined, businessPartner: businessPartner || undefined,
            sku: line.sku, skuName: line.skuName, lotNo: line.lotNo, quantity: line.quantity, uom: line.uom,
          }
          if (session.offline) {
            const created: StockDocument = { ...payload, id: Date.now(), docNo: `PDA-DEMO-${Date.now()}-${Math.floor(Math.random() * 90 + 10)}`, status: canDo(session, 'document:submit') ? 'PENDING_APPROVAL' : 'DRAFT', createdAt: new Date().toISOString() }
            setDocuments(old => [created, ...old])
          } else {
            let created = await api.createDocument(session.accessToken, payload)
            if (canDo(session, 'document:submit') && created.id) created = await api.documentAction(session.accessToken, created.id, 'SUBMIT')
            setDocuments(old => [created, ...old.filter(item => item.id !== created.id)])
          }
        }
      }
      if (!session.offline) await refresh(session)
      notify(currentOp.kind === 'quality' ? '质检作业已保存' : '扫描作业已提交')
      setLines([]); setScanCodes([]); setScreen(currentOp.kind === 'quality' ? 'quality' : 'tasks')
    } catch (error) { notify(error instanceof Error ? error.message : '提交失败；请检查任务状态后重试') }
    finally { setSubmitting(false) }
  }

  const handleDocumentAction = async (document: StockDocument, action: string) => {
    if (!session || !document.id) return
    try {
      const updated = session.offline ? { ...document, status: action === 'SUBMIT' ? 'PENDING_APPROVAL' : action === 'APPROVE' ? 'APPROVED' : action === 'COMPLETE' ? 'COMPLETED' : action === 'REJECT' ? 'REJECTED' : 'CANCELLED' } : await api.documentAction(session.accessToken, document.id, action)
      setDocuments(old => old.map(item => item.id === updated.id ? updated : item)); notify(`单据 ${document.docNo} 已${statusName[updated.status] || updated.status}`)
    } catch (error) { notify(error instanceof Error ? error.message : '处理单据失败') }
  }

  const handleQualityDecision = async (inspection: QualityInspection, result: string) => {
    if (!session || !inspection.id) return
    try {
      const updated = session.offline ? { ...inspection, status: result === 'REJECT' ? 'REJECTED' : result } : await api.decideQuality(session.accessToken, inspection.id, result)
      setInspections(old => old.map(item => item.id === inspection.id ? updated : item)); notify(`质检单 ${inspection.inspectionNo} 已处置`)
    } catch (error) { notify(error instanceof Error ? error.message : '质检处置失败') }
  }

  if (!session) return <Login onSubmit={handleLogin} login={login} setLogin={setLogin} error={loginError} onSso={startSso} />

  const filteredInventory = inventory.filter(item => !query || [item.sku, item.skuName, item.lotNo, item.warehouseCode, item.locationCode].some(value => value.toLowerCase().includes(query.toLowerCase())))
  const filteredTasks = documents.filter(document => taskFilter === '全部' || (taskFilter === '待办' && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(document.status)) || (taskFilter === '已完成' && ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(document.status)))
  const pageTitle = screen === 'operation' && currentOp ? currentOp.title : ({ home: '工作台', operation: '扫码作业', tasks: '任务队列', inventory: '库存查询', quality: '质量记录', profile: '我的' } as Record<Screen, string>)[screen]

  return <div className="pda-shell">
    <header className="pda-topbar">
      <div className="pda-brand"><div className="pda-brand-mark"><Boxes size={20}/></div><div><strong>EasyWMS PDA</strong><small>{session.user.displayName} · {session.user.tenantId}</small></div></div>
      <div className="pda-top-actions"><span className={`pda-network ${online ? 'online' : ''}`}><i/>{online ? '在线' : '离线'}</span><button aria-label="同步数据" className="pda-icon-button" onClick={() => void refresh(session)}><RefreshCw size={17}/></button></div>
    </header>

    <main className="pda-main">
      <div className="pda-heading-row"><div><div className="pda-eyebrow">仓储作业中心</div><h1>{pageTitle}</h1></div>{screen !== 'home' && <button className="pda-back-button" onClick={() => { setScreen('home'); setCurrentOp(null) }}><ArrowLeft size={16}/> 返回</button>}</div>

      {screen === 'home' && <>
        <section className="pda-summary-card"><div><span>待处理任务</span><strong>{pendingCount}</strong><small>待审批、待过账与待检记录</small></div><div className="pda-summary-icon"><ClipboardCheck size={25}/></div><button className="pda-summary-link" onClick={() => setScreen('tasks')}>查看任务 <ArrowRight size={16}/></button></section>
        {canDo(session, 'inventory:read') && <section className="pda-scan-entry" onClick={() => openOperation(operationGroups[4].operations[0])}><div className="pda-scan-icon"><Barcode size={24}/></div><div><b>快速扫码查询</b><span>输入、扫描物料或批次条码</span></div><ArrowRight size={18}/></section>}
        {allowedOperations.map(group => <section className="pda-module" key={group.title}><div className="pda-module-title"><group.icon size={17}/><h2>{group.title}</h2></div><div className="pda-operation-grid">{group.operations.map(op => <button key={op.id} className="pda-operation-tile" onClick={() => openOperation(op)}><span className="pda-tile-icon"><op.icon size={20}/></span><b>{op.title}</b><small>{op.description}</small></button>)}</div></section>)}
      </>}

      {screen === 'operation' && currentOp && <section className="pda-work-card">
        <div className="pda-work-intro"><span className="pda-work-symbol"><currentOp.icon size={22}/></span><div><b>{currentOp.title}</b><small>{currentOp.description}</small></div><span className="pda-step">扫码</span></div>
        {currentOp.kind !== 'barcode' && <form className="pda-scan-form" onSubmit={event => { event.preventDefault(); handleScan(scanText) }}>
          <label htmlFor="pda-scan">扫描物料 / 批次条码</label><div className="pda-scan-input-wrap"><Barcode size={19}/><input id="pda-scan" ref={scanInput} autoComplete="off" value={scanText} onChange={event => setScanText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleScan(scanText) } }} placeholder="将光标放在此处后触发扫描"/><button type="button" title="摄像头扫码" className="pda-camera-button" onClick={() => void startCamera()}><Camera size={19}/></button></div><button className="pda-scan-submit" type="submit">确认扫码</button><p className="pda-scan-hint">支持设备扫描头、USB 扫描枪、相机扫码和手动输入；扫描头请设置回车后缀。</p>
        </form>}
        {currentOp.kind === 'barcode' && <div className="pda-scan-form"><label htmlFor="pda-scan">扫描标签条码</label><div className="pda-scan-input-wrap"><Barcode size={19}/><input id="pda-scan" ref={scanInput} autoComplete="off" value={scanText} onChange={event => setScanText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handleScan(scanText) } }} placeholder="逐一扫描本次要核对的标签"/><button type="button" className="pda-camera-button" onClick={() => void startCamera()}><Camera size={19}/></button></div><button className="pda-scan-submit" onClick={() => handleScan(scanText)}>添加标签</button><p className="pda-scan-hint">扫描清单保存在当前会话，可人工核对重复标签和数量。</p></div>}

        {currentOp.kind === 'query' && <div className="pda-query-shortcut"><button onClick={() => { setCurrentOp(null); setScreen('inventory') }}><Search size={17}/> 打开库存查询</button></div>}

        {(currentOp.source || currentOp.target || currentOp.kind === 'quality') && <div className="pda-location-grid">
          {currentOp.source && <label>来源仓库<select value={sourceWarehouse} onChange={event => setSourceWarehouse(event.target.value)}>{warehouses.map(item => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>}
          {currentOp.source && <label>来源库位<input value={sourceLocation} onChange={event => setSourceLocation(event.target.value)} placeholder="扫描或输入库位"/></label>}
          {(currentOp.target || currentOp.kind === 'quality') && <label>目标仓库<select value={targetWarehouse} onChange={event => setTargetWarehouse(event.target.value)}>{warehouses.map(item => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>}
          {currentOp.target && <label>目标库位<input value={targetLocation} onChange={event => setTargetLocation(event.target.value)} placeholder="扫描或输入库位"/></label>}
          {currentOp.kind === 'quality' && canDo(session, 'quality:decide') && <label>检验结果<select value={qualityResult} onChange={event => setQualityResult(event.target.value)}><option value="PASS">合格放行</option><option value="HOLD">暂挂复核</option><option value="REJECT">判定不合格</option></select></label>}
          {currentOp.kind !== 'quality' && <label className="pda-wide-field">业务参考号 / 往来单位<input value={businessPartner} onChange={event => setBusinessPartner(event.target.value)} placeholder="选填，如工单、ASN 或客户"/></label>}
        </div>}

        {currentOp.kind === 'query' && <div className="pda-inventory-list pda-inline-query">{filteredInventory.slice(0, 8).map(item => <InventoryCard key={`${item.warehouseCode}-${item.locationCode}-${item.sku}-${item.lotNo}`} item={item}/>)}</div>}

        {currentOp.kind === 'barcode' ? <div className="pda-scanned-list"><div className="pda-list-heading"><b>已扫描条码</b><span>{scanCodes.length} 个</span></div>{scanCodes.length ? scanCodes.map((code, index) => <div className="pda-code-row" key={`${code}-${index}`}><span className="pda-code-index">{String(index + 1).padStart(2, '0')}</span><b>{code}</b><button aria-label="移除" onClick={() => setScanCodes(old => old.filter((_, i) => i !== index))}><X size={16}/></button></div>) : <Empty text="扫描标签后显示在这里"/>}</div> : currentOp.kind !== 'query' && <div className="pda-scanned-list"><div className="pda-list-heading"><b>物料清单</b><span>{lines.length} 项</span></div>{lines.length ? lines.map(line => <div className="pda-line-card" key={line.key}><div className="pda-line-main"><span className="pda-line-check"><Check size={15}/></span><div><b>{line.sku || '未识别物料'}</b><small>{line.skuName || '请填写物料名称'}{line.lotNo ? ` · ${line.lotNo}` : ''}</small><em>本次数量 {line.quantity} {line.uom}</em>{line.available !== undefined && <em>当前库存 {line.available}</em>}</div><button aria-label="移除物料" onClick={() => removeLine(line.key)}><Trash2 size={16}/></button></div><div className="pda-line-edit"><label>物料编码<input value={line.sku} onChange={event => updateLine(line.key, { sku: event.target.value })}/></label><label>物料名称<input value={line.skuName} onChange={event => updateLine(line.key, { skuName: event.target.value })}/></label><label>批次<input value={line.lotNo} onChange={event => updateLine(line.key, { lotNo: event.target.value })}/></label><label>数量<input type="number" min={currentOp.docType === 'COUNT' ? '0' : '0.0001'} step="any" value={line.quantity} onChange={event => updateLine(line.key, { quantity: Number(event.target.value) })}/></label></div></div>) : <Empty text="等待扫描物料条码"/>}</div>}

        {scanHistory.length > 0 && <div className="pda-recent-scans"><b>最近扫描</b>{scanHistory.slice(0, 3).map((code, index) => <span key={`${code}-${index}`}>{code}</span>)}</div>}
        <div className="pda-work-footer"><button className="pda-secondary-button" onClick={() => { setLines([]); setScanCodes([]); setScanHistory([]) }}>清空清单</button><button className="pda-primary-button" disabled={submitting || (currentOp.kind === 'barcode' ? scanCodes.length === 0 : currentOp.kind !== 'query' && lines.length === 0)} onClick={() => void saveOperation()}>{submitting ? '正在提交…' : currentOp.kind === 'barcode' ? '完成核对' : currentOp.kind === 'query' ? '查询库存' : '提交作业'} <ArrowRight size={17}/></button></div>
      </section>}

      {screen === 'tasks' && <section className="pda-task-screen"><div className="pda-filter-row">{['全部', '待办', '已完成'].map(filter => <button key={filter} className={taskFilter === filter ? 'active' : ''} onClick={() => setTaskFilter(filter)}>{filter}{filter === '待办' && <i>{pendingCount}</i>}</button>)}</div>{filteredTasks.length ? filteredTasks.map(document => <TaskCard key={`${document.id}-${document.docNo}`} document={document} session={session} onAction={action => void handleDocumentAction(document, action)}/>) : <Empty text="当前没有符合条件的仓储任务"/>}</section>}

      {screen === 'inventory' && <section className="pda-inventory-screen"><div className="pda-search-box"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="物料编码、名称、批次、仓库或库位"/><button onClick={() => void refresh(session)}><RefreshCw size={16}/></button></div><div className="pda-result-count">{loadingData ? '正在同步…' : `找到 ${filteredInventory.length} 条库存`}</div>{filteredInventory.length ? filteredInventory.map(item => <InventoryCard key={`${item.warehouseCode}-${item.locationCode}-${item.sku}-${item.lotNo}`} item={item}/>) : <Empty text="没有匹配库存；可扫描物料编码或批次号"/>}</section>}

      {screen === 'quality' && <section className="pda-quality-screen">{inspections.length ? inspections.map(inspection => <InspectionCard key={`${inspection.id}-${inspection.inspectionNo}`} inspection={inspection} canDecide={canDo(session, 'quality:decide')} onDecide={result => void handleQualityDecision(inspection, result)}/>) : <Empty text="当前没有质检记录；可从采购收货模块登记检验"/>}</section>}

      {screen === 'profile' && <section className="pda-profile-card"><div className="pda-avatar">{session.user.displayName.slice(0, 1)}</div><h2>{session.user.displayName}</h2><p>{session.user.username} · 租户 {session.user.tenantId}</p><div className="pda-profile-row"><span>角色</span><b>{session.user.role}</b></div><div className="pda-profile-row"><span>服务状态</span><b>{session.offline ? '离线演示' : online ? '已连接' : '网络离线'}</b></div><div className="pda-profile-row"><span>设备扫描</span><b>键盘扫描头 / 相机 / 手动输入</b></div><button className="pda-logout-button" onClick={() => { localStorage.removeItem('easywms:pda-session'); setSession(null); setScreen('home') }}><LogOut size={17}/> 退出登录</button></section>}
    </main>

    <nav className="pda-bottom-nav"><button className={screen === 'home' || screen === 'operation' ? 'active' : ''} onClick={() => { setScreen('home'); setCurrentOp(null) }}><Boxes size={19}/><span>工作台</span></button><button className={screen === 'tasks' ? 'active' : ''} onClick={() => setScreen('tasks')}><ClipboardList size={19}/><span>任务</span>{pendingCount > 0 && <i>{pendingCount}</i>}</button>{canDo(session, 'inventory:read') && <button className={screen === 'inventory' ? 'active' : ''} onClick={() => setScreen('inventory')}><Search size={19}/><span>库存</span></button>}{canDo(session, 'quality:read') && <button className={screen === 'quality' ? 'active' : ''} onClick={() => setScreen('quality')}><ShieldCheck size={19}/><span>质检</span></button>}<button className={screen === 'profile' ? 'active' : ''} onClick={() => setScreen('profile')}><Package size={19}/><span>我的</span></button></nav>

    {cameraOpen && <div className="pda-camera-backdrop" onClick={stopCamera}><div className="pda-camera-panel" onClick={event => event.stopPropagation()}><div className="pda-camera-title"><b>相机扫码</b><button onClick={stopCamera}><X size={19}/></button></div>{cameraError ? <div className="pda-camera-error">{cameraError}</div> : <><video ref={video} autoPlay muted playsInline/><div className="pda-camera-frame"/><small>将条码放入框内；部分浏览器需 HTTPS</small></>}</div></div>}
    {toast && <div className="pda-toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function Login({ onSubmit, login, setLogin, error, onSso }: { onSubmit: (event: FormEvent) => void; login: { tenantId: string; username: string; password: string }; setLogin: (value: { tenantId: string; username: string; password: string }) => void; error: string; onSso: () => void }) {
  return <main className="pda-login-page"><div className="pda-login-brand"><div className="pda-login-logo"><Boxes size={30}/></div><span>EasyWMS</span><small>仓储现场作业终端</small></div><form className="pda-login-card" onSubmit={onSubmit}><h1>PDA 登录</h1><p>登录后开始扫描与仓储作业</p><label>租户 ID<input value={login.tenantId} onChange={event => setLogin({ ...login, tenantId: event.target.value })} required inputMode="numeric"/></label><label>用户名<input autoComplete="username" value={login.username} onChange={event => setLogin({ ...login, username: event.target.value })} required/></label><label>密码<input type="password" autoComplete="current-password" value={login.password} onChange={event => setLogin({ ...login, password: event.target.value })} required/></label>{error && <div className="pda-login-error">{error}</div>}<button className="pda-login-submit">登录作业台</button><button type="button" className="pda-sso-button" onClick={onSso}>企业单点登录</button><small>演示账号：1001 / admin / admin123</small></form><footer>跨平台 H5 · 适配 Android PDA、手机、平板与桌面浏览器</footer></main>
}

function InventoryCard({ item }: { item: InventoryItem }) {
  return <article className="pda-inventory-card"><div className="pda-inventory-card-top"><b>{item.sku}</b><span className={`pda-quality ${item.qualityStatus === '合格' ? 'good' : ''}`}>{item.qualityStatus}</span></div><strong>{item.skuName}</strong><div className="pda-inventory-meta"><span><Warehouse size={13}/>{item.warehouseCode} / {item.locationCode}</span><span><Barcode size={13}/>{item.lotNo || '无批次'}</span></div><div className="pda-inventory-qty"><span>现有库存</span><b>{new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(item.quantity)} <small>{item.uom}</small></b></div></article>
}

function TaskCard({ document, session, onAction }: { document: StockDocument; session: Session; onAction: (action: string) => void }) {
  const actions = document.status === 'DRAFT' && canDo(session, 'document:submit') ? [['SUBMIT', '提交']] : document.status === 'PENDING_APPROVAL' && canDo(session, 'approval:decide') ? [['APPROVE', '审批通过'], ['REJECT', '驳回']] : document.status === 'APPROVED' && canDo(session, 'document:post') ? [['COMPLETE', '执行过账']] : []
  return <article className="pda-task-card"><div className="pda-task-top"><span className="pda-task-type">{docTypeName[document.docType] || document.docType}</span><span className={`pda-task-status ${document.status === 'COMPLETED' ? 'done' : document.status === 'REJECTED' ? 'rejected' : ''}`}><i/>{statusName[document.status] || document.status}</span></div><h3>{document.docNo}</h3><div className="pda-task-product">{document.sku} · {document.skuName}</div><div className="pda-task-meta"><span>{document.sourceWarehouse || document.targetWarehouse || '—'}</span><span>{document.quantity} {document.uom}</span></div>{actions.length > 0 && <div className="pda-task-actions">{actions.map(([action, label]) => <button key={action} className={action === 'REJECT' ? 'danger' : ''} onClick={() => onAction(action)}>{label}</button>)}</div>}</article>
}

function InspectionCard({ inspection, canDecide, onDecide }: { inspection: QualityInspection; canDecide: boolean; onDecide: (result: string) => void }) {
  const status = inspection.status === 'REJECTED' ? '不合格 / 冻结' : inspection.status === 'PASS' ? '合格放行' : inspection.status === 'HOLD' ? '暂挂复核' : '待检'
  return <article className="pda-task-card"><div className="pda-task-top"><span className="pda-task-type">{inspection.inspectionType}</span><span className={`pda-task-status ${inspection.status === 'PASS' ? 'done' : inspection.status === 'REJECTED' ? 'rejected' : ''}`}><i/>{status}</span></div><h3>{inspection.inspectionNo}</h3><div className="pda-task-product">{inspection.sku} · {inspection.skuName}</div><div className="pda-task-meta"><span>{inspection.warehouseCode} · {inspection.lotNo}</span><span>检验 {inspection.inspectedQty}</span></div>{inspection.status === 'PENDING' && canDecide && <div className="pda-task-actions"><button onClick={() => onDecide('PASS')}>合格放行</button><button onClick={() => onDecide('HOLD')}>暂挂</button><button className="danger" onClick={() => onDecide('REJECT')}>不合格</button></div>}</article>
}

function Empty({ text }: { text: string }) { return <div className="pda-empty"><FileText size={25}/><span>{text}</span></div> }
