import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { HookContext } from "@w6w/types";
import sessionList from "../actions/session-list.ts";
import panelistList from "../actions/panelist-list.ts";

/** GoTo caps `size` at 200 (OpenAPI `size` parameter, maximum 200). */
const PAGE = 200;
/** One webinar rarely has more than a few sessions; 10 pages x 200 is a generous bound. */
const MAX_PAGES = 10;

/**
 * A webinar's completed sessions (`GET .../webinars/{webinarKey}/sessions`, "all past sessions"),
 * read page by page until a short page, then compared as a whole snapshot keyed by `sessionKey`.
 */
export async function pollSessions(state: unknown, webinarKey: string, ctx: HookContext) {
  const rows: Array<{ key: string; values: unknown }> = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await sessionList.execute({ webinarKey, page, size: PAGE }, ctx) as {
      sessions?: Array<{ sessionKey?: unknown }>;
    };
    const items = result.sessions ?? [];
    for (const item of items) rows.push({ key: String(item.sessionKey ?? ""), values: item });
    if (items.length < PAGE) break;
    if (page === MAX_PAGES - 1) {
      throw new Error(
        `Webinar has more than ${MAX_PAGES * PAGE} sessions; new-session reads that many.`,
      );
    }
  }
  return await pollSnapshot({ state, rows, emit: { added: true, updated: false } });
}

/** A webinar's panelists (`GET .../webinars/{webinarKey}/panelists`, one unpaginated array). */
export async function pollPanelists(state: unknown, webinarKey: string, ctx: HookContext) {
  const result = await panelistList.execute({ webinarKey }, ctx) as {
    panelists?: Array<{ panelistId?: unknown }>;
  };
  return await pollSnapshot({
    state,
    rows: (result.panelists ?? []).map((p) => ({ key: String(p.panelistId ?? ""), values: p })),
    emit: { added: true, updated: false },
  });
}
