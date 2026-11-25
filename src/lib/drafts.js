const DRAFT_PREFIX = "sp:draft:";

export function loadDraft(e) {
  try {
    let t = localStorage.getItem(DRAFT_PREFIX + e);
    if (t) {
      return JSON.parse(t);
    }
    return null;
  } catch {
    return null;
  }
}

export function saveDraft(e, t) {
  try {
    localStorage.setItem(DRAFT_PREFIX + e, JSON.stringify(t));
  } catch {}
}

export function clearDraft(e) {
  try {
    localStorage.removeItem(DRAFT_PREFIX + e);
  } catch {}
}
