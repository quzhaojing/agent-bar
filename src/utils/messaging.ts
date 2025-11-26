export async function send(type: string, payload?: any): Promise<any> {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      return { success: false, error: 'runtime_unavailable' };
    }
    const res = await chrome.runtime.sendMessage({ type, payload });
    return res;
  } catch (e: any) {
    return { success: false, error: e?.message || 'send_failed' };
  }
}

export async function ping(): Promise<boolean> {
  const r = await send('PING', { ts: Date.now() });
  return !!(r && r.success);
}

export async function openOptions(route: string): Promise<boolean> {
  const r = await send('OPEN_OPTIONS', route);
  return !!(r && r.success);
}

export async function getStorage(key: string): Promise<any> {
  const r = await send('GET_STORAGE', { key });
  return r && r.success ? r.data : undefined;
}

export async function setStorage(key: string, value: any): Promise<boolean> {
  const r = await send('SET_STORAGE', { setKey: key, setValue: value });
  return !!(r && r.success);
}

export async function apiRequest(payload: any): Promise<any> {
  const r = await send('API_REQUEST', payload);
  return r;
}
