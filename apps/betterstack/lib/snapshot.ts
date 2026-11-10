import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** The vendor maximum page size for the list endpoints (see the `per_page` param hint). */
export const PAGE_SIZE = 250;
/** 20 pages of 250 = the snapshot kit's 5000-row cap. */
export const MAX_PAGES = 20;

interface ListResult {
  items?: Array<Record<string, unknown>>;
  hasMore?: boolean;
}

export interface SnapshotListSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** The app's own list action; the poll runs the SAME request through its `execute`. */
  // deno-lint-ignore no-explicit-any
  action: ActionDefinition<any>;
  /** The action's input for one page. */
  input(params: P, page: number): Record<string, unknown>;
}

/**
 * New-record trigger for a bounded Better Stack collection (brief 9.1 c): the whole collection
 * is read (250 per page, at most 20 pages) and diffed by id with `pollSnapshot`, added only.
 * The first check records the ids and emits nothing. More than 5000 rows is refused loudly.
 */
export function snapshotList<P = Record<string, unknown>>(
  spec: SnapshotListSpec<P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const byId = new Map<string, Record<string, unknown>>();
      let more = true;
      for (let page = 1; more && page <= MAX_PAGES; page++) {
        const input = spec.input(params, page);
        const res = await spec.action.execute(input, ctx) as ListResult;
        for (const item of res.items ?? []) byId.set(String(item.id), item);
        // An action without a `page` input (the comment list) is one request.
        more = "page" in input && res.hasMore === true && (res.items ?? []).length > 0;
      }
      if (more) {
        throw new Error(
          `${spec.key}: the collection holds more than ${
            MAX_PAGES * PAGE_SIZE
          } rows (the snapshot cap)`,
        );
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
