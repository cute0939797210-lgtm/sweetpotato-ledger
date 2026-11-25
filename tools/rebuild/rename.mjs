import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
const traverse = _traverse.default, generate = _generate.default;
const MAP = {
  Zi:'evalFormula', Hr:'looksLikeFormula', _e:'today', jr:'parseDate', Pd:'isoDate', Vt:'addDays', ht:'weekday', $t:'WEEKDAYS', Pe:'monthStart', Xe:'monthEnd', je:'addMonths', em:'weekStart', De:'shortDate', Ol:'dateLabel', Bt:'monthLabel', Zx:'fmtInt', Jx:'fmtDec', w:'money', Me:'num', Ji:'pct',
  bg:'parseHash', useYg:'useRoute', ae:'navigate', rl:'goBack',
  hg:'CONFIG_KEY', vg:'SESSION_KEY', xg:'lsGet', _g:'lsSet', Ds:'getConfig', Ii:'saveConfig', Xr:'hasBuiltinConfig', la:'DbError', Ng:'friendlyError', set_1:'sessionListeners', Fi:'setSession', kg:'authRequest', Qr:'refreshing', Fx:'ensureSession', Pa:'auth', Sg:'requireConfig',
  re:'eq', ce:'gte', be:'lte', wg:'gt', I:'isNull', wt:'inList', V1:'neq', gg:'buildQuery', Gr:'request', C:'db',
  q:'cx', TeComponent:'Page', He1Component:'Section', Te1Component:'Card', XComponent:'Btn', PComponent:'Field', Rt1Component:'MoneyInput', ze:'parseMoney', KtComponent:'Segmented', RsComponent:'Chips', Ul1Component:'Toggle', XaComponent:'Loading', ReComponent:'Empty', VaComponent:'ErrorBox', JeComponent:'QueryView', VeComponent:'Money', ZtComponent:'Badge', Ve1Component:'Row', YeComponent:'List', Cl1Component:'Sheet', MgContext:'FeedbackContext', AgComponent:'FeedbackProvider', useEt:'useFeedback', useDt:'useSaver', DgComponent:'RowActions', useOs:'useRemove', Am1Component:'Collapse',
  Px:'EMPTY_STORE', RgContext:'StoreContext', Dn:'NOT_DELETED', OgComponent:'StoreProvider', useDe:'useStore', useNe:'useQuery',
  BgComponent:'AuthShell', Qg1Component:'SetupForm', LgComponent:'LoginForm',
  Jt:'isWagePayer', zl:'isOwe', Kr:'TIER_LABELS', $g:'DAY_STATUS_LABELS', nm:'PAYMENT_KIND_LABELS', Wi:'ACCOUNT_KIND_LABELS', zs:'ADJ_REASON_LABELS',
  Ug:'pnlEntries', Hg:'totals', jg:'monthlySummaries', Zr:'dayBundle', Jr:'suggestMarkets',
  Qg:'loadZip', Yg:'xmlEscape', e1:'colName', Da:'writeXlsx', Ka:'download', t1:'colIndex', Gg:'readXlsx', Xg:'parseCsv', Vg:'excelDate',
  dl:'BACKUP_KEY', a1:'BACKUP_TABLES', n1:'fetchAllRows', Kg:'downloadBackup', Zg:'markBackedUp',
  On:'NO_STALL', Jg:'FIRST_GROUPS', Pi:'buildStallMonth', Fg:'loadStallMonth', Ig:'rankStalls', Bs:'savedKey', lm:'markStallMonthSaved', FrComponent:'StallRanking',
  im:'SECTION_TITLES', Th1Component:'Import', PrComponent:'ColumnChart', Qs1Component:'BarList',
  s1:'REPORT_TABS', Ih1Component:'MonthNav', Om1Component:'YearNav', Oh1Component:'Reports', I11:'MonthReport', O11:'YearReport',
  Ch1Component:'Settings', p1:'THEMES', b1:'applyTheme', Y11:'ThemePicker', G11:'SettingsHome', LsComponent:'CrudList', Um1Component:'CrudForm',
  v1:'CATEGORY_CFG', x1:'ACCOUNT_CFG', _1:'RECURRING_CFG', N1:'PAYER_CFG', k1:'SUPPLIER_CFG', S1:'ITEM_CFG', rm:'MARKET_CFG',
  dh:'TRAVEL', to:'isTravel', Cm1Component:'PlanCalendar', T1Component:'MarketDetail', mh:'backupAgo', D1Component:'ConnectionSettings', R1:'reloadLatest',
  $s:'nextMonthRentDue', dm:'inLastDays', Yh1Component:'WarehouseRent',
  fm:'PERIOD_LABELS', z1:'periodRange', B1Component:'MoneyBar', Q11:'CountsCard', L1Component:'Alerts', $1:'MonthEndCheck', Hh1Component:'Home',
  U1:'cleanDescription', H1:'txnLabel', j1:'TYPE_LABELS', Y1:'SOURCE_LABELS', Q1:'txnMeta', BlComponent:'TxnList',
  pm:'DRAFT_PREFIX', au:'loadDraft', nu:'saveDraft', Us:'clearDraft',
  lu:'BILLS', G1:'parseBills', X1:'billsFormula', vh:'CASH_COUNTER_MODE_KEY', Su1Component:'CashCounter',
  _h:'PAY_METHODS', bm:'PAY_CODES', Nh:'OTHER_CODES', kh:'SALARY_CODES', K1:'WEATHER', Wh1Component:'Daily', Z1Component:'DailyForm',
  J1Component:'CategorySelect', Ru1Component:'AccountSelect', EhComponent:'Entry', F1Component:'EntryForm', ThComponent:'Transactions',
  ChComponent:'StockLedger', W1:'PURCHASE_TABS', AhComponent:'Purchases', MhComponent:'PurchaseEdit', E2Component:'PurchaseForm', T2Component:'SupplierBalances', N2Component:'SupplierDetail',
  DhComponent:'Accounts', L2Component:'AccountsHome', S2Component:'AccountLedger',
  RhComponent:'Personal', O2Component:'PersonalYear',
  gm:'RECONCILED_TAG', Oh:'isReconciled', Zh1Component:'Reconcile', BhComponent:'StallMonth',
  qh:'PORTION_KEY', r_:'TAEL_G', u_:'PORTION_SIZES', c_:'loadPortionOpts', LhComponent:'PortionCost',
  d_:'NAV_ITEMS', M2Component:'BottomNav', F2Component:'Shell', HComponent:'App',
};
const src = fs.readFileSync('src/main.jsx', 'utf8');
const ast = parse(src, { sourceType: 'module', plugins: ['jsx'] });
// 所有名字（避免改名撞到裡面的區域變數）
const used = new Set();
traverse(ast, { Scope(p) { for (const n of Object.keys(p.scope.bindings)) used.add(n); } , Identifier(p) { used.add(p.node.name); } });
let done = 0, skipped = [];
traverse(ast, { Program(p) {
  for (const [from, to] of Object.entries(MAP)) {
    const b = p.scope.getBinding(from); if (!b) { skipped.push(from + '(none)'); continue; }
    let name = to; while (used.has(name)) name += '_';
    p.scope.rename(from, name); used.add(name); done++;
  }
  p.stop();
} });
fs.writeFileSync('src/main.jsx', generate(ast, { jsescOption: { minimal: true } }).code);
console.log('renamed', done, 'skipped', skipped);
