import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import workspaceGetMany from "../actions/workspace-get-many.ts";
import { idOf, itemsOf } from "../lib/lists.ts";

const PAGE_SIZE = 200; // documented maximum (https://www.typeform.com/developers/create/reference/retrieve-workspaces/, 2026-11-10)
const MAX_PAGES = 25; // 25 x 200 = 5000 = the snapshot kit's row cap

/**
 * `GET /workspaces` has no sort order and no timestamps, but an account holds a handful of
 * workspaces: every check reads them all (200 per page) and diffs the ids against the previous
 * check (`pollSnapshot`, added only).
 */
const newWorkspace: TriggerDefinition = {
  key: "new-workspace",
  title: "New Workspace",
  description:
    "Fires when a new workspace appears in the Typeform account. The run gets the workspace's id, name, account and form count.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "account_id", type: "string", label: "Account ID" },
    { key: "shared", type: "boolean", label: "Shared" },
    { key: "forms", type: "object", label: "Forms" },
  ],
  sample: {
    id: "WsAbC1",
    name: "Marketing",
    account_id: "ABCD1234",
    shared: false,
    forms: { count: 4, href: "https://api.typeform.com/forms?workspace_id=WsAbC1" },
  },
  async poll({ state }, ctx) {
    const action = workspaceGetMany as unknown as ActionDefinition;
    const all: unknown[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await action.execute({ page, pageSize: PAGE_SIZE }, ctx);
      all.push(...itemsOf(result));
      const pages = Number((result as { page_count?: unknown })?.page_count);
      if (!Number.isFinite(pages) || page >= pages) break;
    }
    const byId = new Map(all.map((w) => [idOf(w, "workspace"), w]));
    const { events, nextState } = await pollSnapshot({
      state,
      rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => byId.get(e.key)), nextState };
  },
};

export default newWorkspace;
