export const isWagePayer = e => !!e?.wage_category_id;

export const isOwe = e => (e ?? "").startsWith("OWE_");

export const TIER_LABELS = {
  0: "非營業收入",
  1: "營業",
  2: "生財器具與固定支出",
  3: "生活開銷／家庭收入（不算生意）",
  4: "帳戶費用（不列損益）"
};

export const DAY_STATUS_LABELS = {
  open: "營業",
  rest: "休息",
  closed: "停業"
};

export const PAYMENT_KIND_LABELS = {
  supplier: "付供應商",
  rent_prepay: "預付租金",
  advance_repay: "還代墊",
  settlement: "其他付款／結清"
};

export const ACCOUNT_KIND_LABELS = {
  cash: "現金",
  post: "郵局",
  bank: "銀行",
  wallet: "電子支付",
  other: "其他"
};

export const ADJ_REASON_LABELS = {
  count: "盤點調整",
  waste: "報廢（爛掉）",
  family: "家人取用",
  bonus: "補貨（$0）",
  other: "其他"
};
