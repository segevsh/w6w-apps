import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;
type Params = Record<string, unknown>;

/** Mural rejects `limit` values of 100 or more (see the list actions' own hint). */
const PAGE_SIZE = 99;
/** 50 pages x 99 rows, just under the kit's 5000-row ceiling. */
const SNAPSHOT_PAGES = 50;

/** A required string/number id param; throws a message naming it when unset. */
function requireParam(params: Params, param: Param): void {
  const value = params[param.key];
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`Set ${param.label} before this trigger can poll.`);
  }
}

/**
 * Bounded collection (brief 9.1 c): the list is read whole, following Mural's `next` token
 * (99 rows per page), and compared check to check; only added rows fire. A list of more than
 * 50 pages is refused rather than compared as a partial one.
 */
export function boundedList(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  /** The action input besides `limit`/`next`. */
  input?(params: Params): Params;
  /** False for an endpoint with no paging (the tags list). */
  paged?: boolean;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const paged = spec.paged !== false;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const p = (params ?? {}) as Params;
      for (const param of spec.params ?? []) if (param.required) requireParam(p, param);
      const all: Item[] = [];
      let next: string | undefined;
      for (let page = 1; page <= (paged ? SNAPSHOT_PAGES : 1); page++) {
        const input = { ...spec.input?.(p), ...(paged ? { limit: PAGE_SIZE, next } : {}) };
        const result = await spec.action.execute(input as never, ctx) as {
          items?: Item[];
          next?: string;
        };
        all.push(...(Array.isArray(result?.items) ? result.items : []));
        next = typeof result?.next === "string" && result.next ? result.next : undefined;
        if (!paged || next === undefined) break;
        if (page === SNAPSHOT_PAGES) {
          throw new Error(`${spec.title} cannot compare more than ${SNAPSHOT_PAGES} pages.`);
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: all.map((item) => ({ key: String(item.id ?? ""), values: item })),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
    output: spec.output,
    sample: spec.sample,
  };
}
