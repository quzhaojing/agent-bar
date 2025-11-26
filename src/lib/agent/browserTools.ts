import { tool } from "@langchain/core/tools"
import * as z from "zod"

type ToolResult<T> = { ok: boolean; result?: T; error?: string }

async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab || tab.id == null) throw new Error("No active tab")
  return tab.id
}

async function waitForTabComplete(tabId: number, timeout = 15000): Promise<void> {
  let done = false
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      if (done) return
      done = true
      chrome.tabs.onUpdated.removeListener(listener)
      reject(new Error("Tab load timeout"))
    }, timeout)
    const listener = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id !== tabId) return
      if (info.status === "complete") {
        if (done) return
        done = true
        clearTimeout(timer)
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function execInTab<T>(func: (...args: any[]) => T, args: any[] = []): Promise<T> {
  const tabId = await getActiveTabId()
  const results = await chrome.scripting.executeScript({ target: { tabId }, func, args })
  const r = results?.[0]?.result as T
  return r
}

export const browser_navigate = tool(async ({ url, waitForLoad, timeout }): Promise<ToolResult<{ url: string }>> => {
  try {
    const tabId = await getActiveTabId()
    await chrome.tabs.update(tabId, { url })
    if (waitForLoad) await waitForTabComplete(tabId, timeout ?? 20000)
    const tabs = await chrome.tabs.get(tabId)
    return { ok: true, result: { url: tabs.url ?? url } }
  } catch (e: any) {
    return { ok: false, error: e?.message || "navigate error" }
  }
}, {
  name: "browser_navigate",
  description: "Navigate current tab to a URL and optionally wait for load",
  schema: z.object({
    url: z.string().describe("Target URL"),
    waitForLoad: z.boolean().nullable().optional().default(true),
    timeout: z.number().nullable().optional().default(20000)
  })
})

export const browser_click_element = tool(async ({ selector, waitForElement, doubleClick, rightClick }): Promise<ToolResult<{ clicked: boolean }>> => {
  try {
    const res = await execInTab((sel: string, wait: boolean, dbl: boolean, rgt: boolean) => {
      function findEl(s: string) { return document.querySelector<HTMLElement>(s) }
      function ensure(el: HTMLElement | null) { return !!el }
      function click(el: HTMLElement, dbl: boolean, rgt: boolean) {
        if (rgt) el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
        else if (dbl) el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }))
        else el.click()
      }
      return new Promise<ToolResult<{ clicked: boolean }>>((resolve) => {
        const attempt = () => {
          const el = findEl(sel)
          if (!ensure(el)) { resolve({ ok: false, error: "element not found" }); return }
          click(el!, dbl, rgt)
          resolve({ ok: true, result: { clicked: true } })
        }
        if (!wait) { attempt(); return }
        const limit = Date.now() + 8000
        const timer = setInterval(() => {
          if (Date.now() > limit) { clearInterval(timer); resolve({ ok: false, error: "wait timeout" }); return }
          const el = findEl(sel)
          if (el) { clearInterval(timer); click(el, dbl, rgt); resolve({ ok: true, result: { clicked: true } }) }
        }, 300)
      })
    }, [selector, !!waitForElement, !!doubleClick, !!rightClick])
    return res
  } catch (e: any) {
    return { ok: false, error: e?.message || "click error" }
  }
}, {
  name: "browser_click_element",
  description: "Click a page element by CSS selector",
  schema: z.object({
    selector: z.string().describe("CSS selector"),
    waitForElement: z.boolean().nullable().optional().default(true),
    doubleClick: z.boolean().nullable().optional().default(false),
    rightClick: z.boolean().nullable().optional().default(false)
  })
})

export const browser_type_text = tool(async ({ selector, text, clearFirst, pressEnter }): Promise<ToolResult<{ typed: boolean }>> => {
  try {
    const res = await execInTab((sel: string, t: string, clr: boolean, enter: boolean) => {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(sel)
      if (!el) return { ok: false, error: "input not found" }
      if (clr) el.value = ""
      el.focus()
      el.value = t
      el.dispatchEvent(new Event("input", { bubbles: true }))
      if (enter) el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
      return { ok: true, result: { typed: true } }
    }, [selector, text, !!clearFirst, !!pressEnter])
    return res
  } catch (e: any) {
    return { ok: false, error: e?.message || "type error" }
  }
}, {
  name: "browser_type_text",
  description: "Type text into an input by selector",
  schema: z.object({
    selector: z.string().describe("Input selector"),
    text: z.string().describe("Text to input"),
    clearFirst: z.boolean().nullable().optional().default(true),
    pressEnter: z.boolean().nullable().optional().default(false)
  })
})

export const browser_wait_for_element = tool(async ({ selector, state, timeout }): Promise<ToolResult<{ fulfilled: boolean }>> => {
  try {
    const res = await execInTab((sel: string, st: string, to: number) => {
      return new Promise<ToolResult<{ fulfilled: boolean }>>((resolve) => {
        const end = Date.now() + to
        const ok = (el: Element | null) => {
          if (st === "visible") return !!el && (el as HTMLElement).offsetParent !== null
          if (st === "hidden") return !!el && (el as HTMLElement).offsetParent === null
          if (st === "present") return !!el
          if (st === "absent") return !el
          return !!el
        }
        const poll = setInterval(() => {
          const el = document.querySelector(sel)
          if (ok(el)) { clearInterval(poll); resolve({ ok: true, result: { fulfilled: true } }) }
          else if (Date.now() > end) { clearInterval(poll); resolve({ ok: false, error: "timeout" }) }
        }, 300)
      })
    }, [selector, state ?? "visible", timeout ?? 10000])
    return res
  } catch (e: any) {
    return { ok: false, error: e?.message || "wait error" }
  }
}, {
  name: "browser_wait_for_element",
  description: "Wait for element state",
  schema: z.object({
    selector: z.string().describe("Element selector"),
    state: z.enum(["visible", "hidden", "present", "absent"]).nullable().optional().default("visible"),
    timeout: z.number().nullable().optional().default(10000)
  })
})

export const browser_scroll_page = tool(async ({ direction, distance, selector, smooth }): Promise<ToolResult<{ scrolled: boolean }>> => {
  try {
    const res = await execInTab((dir: string, dist: number, sel?: string, sm?: boolean) => {
      if (sel) {
        const el = document.querySelector(sel)
        if (!el) return { ok: false, error: "element not found" }
        el.scrollIntoView({ behavior: sm ? "smooth" : "auto" })
        return { ok: true, result: { scrolled: true } }
      }
      const dx = dir === "left" ? -dist : dir === "right" ? dist : 0
      const dy = dir === "up" ? -dist : dir === "down" ? dist : dist
      window.scrollBy({ left: dx, top: dy, behavior: sm ? "smooth" : "auto" })
      return { ok: true, result: { scrolled: true } }
    }, [direction ?? "down", distance ?? 400, selector, smooth])
    return res
  } catch (e: any) {
    return { ok: false, error: e?.message || "scroll error" }
  }
}, {
  name: "browser_scroll_page",
  description: "Scroll page or to element",
  schema: z.object({
    direction: z.enum(["up", "down", "left", "right"]).nullable().optional().default("down"),
    distance: z.number().nullable().optional().default(400),
    selector: z.string().nullable().optional(),
    smooth: z.boolean().nullable().optional().default(true)
  })
})

export const browser_take_screenshot = tool(async ({ area: _area, format }): Promise<ToolResult<{ dataUrl: string }>> => {
  try {
    void _area
    const dataUrl = await new Promise<string>((resolve, reject) => {
      try {
        chrome.tabs.captureVisibleTab({ format: format === "jpeg" ? "jpeg" : "png" }, (dataUrl) => resolve(dataUrl))
      } catch (e) {
        reject(e as any)
      }
    })
    return { ok: true, result: { dataUrl } }
  } catch (e: any) {
    return { ok: false, error: e?.message || "screenshot error" }
  }
}, {
  name: "browser_take_screenshot",
  description: "Capture visible tab screenshot",
  schema: z.object({
    area: z.enum(["viewport", "full", "element"]).nullable().optional().default("viewport"),
    format: z.enum(["png", "jpeg"]).nullable().optional().default("png")
  })
})

export const browser_extract_content = tool(async ({ contentType, selector, structured }): Promise<ToolResult<any>> => {
  try {
    const res = await execInTab((ct: string, sel?: string, st?: boolean) => {
      const scope = sel ? document.querySelector(sel) || document : document
      const pickText = () => (scope as Document | Element).textContent || ""
      const pickLinks = () => Array.from((scope as Document | Element).querySelectorAll("a")).map(a => ({ text: a.textContent || "", href: a.getAttribute("href") || "" }))
      const pickImages = () => Array.from((scope as Document | Element).querySelectorAll("img")).map(img => ({ alt: img.alt || "", src: img.src || img.getAttribute("src") || "" }))
      const pickTables = () => Array.from((scope as Document | Element).querySelectorAll("table")).map(table => Array.from(table.querySelectorAll("tr")).map(tr => Array.from(tr.querySelectorAll("th,td")).map(td => td.textContent || "")))
      const pickForms = () => Array.from((scope as Document | Element).querySelectorAll("form")).map(form => ({ action: form.getAttribute("action") || "", method: form.getAttribute("method") || "get", inputs: Array.from(form.querySelectorAll("input,textarea,select")).map(el => ({ name: (el.getAttribute("name") || ""), type: (el.tagName.toLowerCase()), value: (el as any).value ?? "" })) }))
      const any = () => ({ text: pickText(), links: pickLinks(), images: pickImages(), tables: pickTables(), forms: pickForms() })
      const data = ct === "text" ? pickText() : ct === "links" ? pickLinks() : ct === "images" ? pickImages() : ct === "tables" ? pickTables() : ct === "forms" ? pickForms() : any()
      return st ? { ok: true, result: data } : { ok: true, result: { data } }
    }, [contentType ?? "all", selector, structured])
    return res
  } catch (e: any) {
    return { ok: false, error: e?.message || "extract error" }
  }
}, {
  name: "browser_extract_content",
  description: "Extract page content in structured form",
  schema: z.object({
    contentType: z.enum(["text", "links", "images", "tables", "forms", "all"]).nullable().optional().default("all"),
    selector: z.string().nullable().optional(),
    structured: z.boolean().nullable().optional().default(true)
  })
})

export const browser_select_dropdown = tool(async ({ selector, value, selectBy }): Promise<ToolResult<{ selected: boolean }>> => {
  try {
    const res = await execInTab((sel: string, val: string, by: string) => {
      const el = document.querySelector<HTMLSelectElement>(sel)
      if (!el) return { ok: false, error: "select not found" }
      if (by === "index") { const i = parseInt(val, 10); if (!isNaN(i) && el.options[i]) el.selectedIndex = i }
      else if (by === "text") { const opt = Array.from(el.options).find(o => o.textContent === val); if (opt) el.value = opt.value }
      else { el.value = val }
      el.dispatchEvent(new Event("change", { bubbles: true }))
      return { ok: true, result: { selected: true } }
    }, [selector, value, selectBy ?? "value"])
    return res
  } catch (e: any) {
    return { ok: false, error: e?.message || "select error" }
  }
}, {
  name: "browser_select_dropdown",
  description: "Select an option in a dropdown",
  schema: z.object({
    selector: z.string().describe("Select element selector"),
    value: z.string().describe("Value/text/index"),
    selectBy: z.enum(["value", "text", "index"]).nullable().optional().default("value")
  })
})

export const browser_refresh_page = tool(async ({ force, waitForLoad }): Promise<ToolResult<{ refreshed: boolean }>> => {
  try {
    const tabId = await getActiveTabId()
    await chrome.tabs.reload(tabId, { bypassCache: !!force })
    if (waitForLoad) await waitForTabComplete(tabId, 15000)
    return { ok: true, result: { refreshed: true } }
  } catch (e: any) {
    return { ok: false, error: e?.message || "refresh error" }
  }
}, {
  name: "browser_refresh_page",
  description: "Refresh the current tab",
  schema: z.object({
    force: z.boolean().nullable().optional().default(false),
    waitForLoad: z.boolean().nullable().optional().default(true)
  })
})

export const browser_tab_management = tool(async ({ action, target, url }): Promise<ToolResult<{ action: string; tabId?: number }>> => {
  try {
    if (action === "new") {
      const tab = await chrome.tabs.create({ url: url || "about:blank" })
      return { ok: true, result: { action, tabId: tab.id! } }
    }
    const current = await getActiveTabId()
    if (action === "close") { await chrome.tabs.remove(current); return { ok: true, result: { action } } }
    if (action === "switch") {
      if (typeof target === "number") { await chrome.tabs.update(target, { active: true }); return { ok: true, result: { action, tabId: target } } }
      const tabs = await chrome.tabs.query({})
      const found = tabs.find(t => t.url && target && t.url.includes(String(target)))
      if (found?.id != null) { await chrome.tabs.update(found.id, { active: true }); return { ok: true, result: { action, tabId: found.id } } }
      return { ok: false, error: "target tab not found" }
    }
    if (action === "open") { await chrome.tabs.update(current, { url: url! }); return { ok: true, result: { action, tabId: current } } }
    return { ok: false, error: "unsupported action" }
  } catch (e: any) {
    return { ok: false, error: e?.message || "tab error" }
  }
}, {
  name: "browser_tab_management",
  description: "Manage tabs: new, open, close, switch",
  schema: z.object({
    action: z.enum(["open", "close", "switch", "new"]),
    target: z.union([z.string(), z.number()]).nullable().optional(),
    url: z.string().nullable().optional()
  })
})

export const browserTools = {
  browser_navigate,
  browser_click_element,
  browser_type_text,
  browser_wait_for_element,
  browser_scroll_page,
  browser_take_screenshot,
  browser_extract_content,
  browser_select_dropdown,
  browser_refresh_page,
  browser_tab_management
}

export type BrowserToolName = keyof typeof browserTools
