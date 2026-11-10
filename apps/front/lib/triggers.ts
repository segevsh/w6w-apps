import type { ActionDefinition, HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;

/** Ids kept in the seen window: the page is 100 wide, so five pages' worth of headroom. */
const SEEN_WINDOW = 500;
/** One page of the activity-ordered feed per check; Front's page size caps at 100. */
const PAGE_SIZE = 100;

const seconds = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n * 1000 : undefined;
};

/**
 * Newest-activity-first feed (brief 9.1 a). `GET /conversations` is "in reverse chronological
 * order (most recently updated first)" and honours the company's bump settings
 * (https://dev.frontapp.com/reference/list-conversations, verified 2026-11-10), so an OLD
 * conversation that is bumped by a reply surfaces on page 1 as well. The seed therefore stores
 * `floor = now` and a later check drops every item whose own stamp (`stampOf`) is before it
 * (brief 9.9): only a conversation created (or edited) after the trigger was switched on can fire.
 * An item with no stamp is kept.
 */
export function conversationFeed(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** Seconds-since-epoch field the floor compares: `created_at` or `updated_at`. */
  stampField: "created_at" | "updated_at";
  /** Dedupe id; the edited-record trigger appends the update stamp so an edit is a new event. */
  idOf(item: Item): string;
  output: TriggerDefinition["output"];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    async poll({ state }, ctx: HookContext) {
      const now = Date.now();
      const prior = (state && typeof state === "object" ? state : {}) as Record<string, unknown>;
      const floor = typeof prior.floor === "number" ? prior.floor : undefined;
      const { events, nextState } = await pollNewItems<Item>({
        state,
        maxPages: 1,
        maxEvents: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        async fetchPage() {
          const result = await spec.action.execute(
            { limit: PAGE_SIZE, sortOrder: "desc" },
            ctx,
          ) as Item[];
          const items = Array.isArray(result) ? result : [];
          return {
            items: items.filter((item) => {
              const ms = seconds(item[spec.stampField]);
              return floor === undefined || ms === undefined || ms >= floor;
            }),
          };
        },
      });
      return { events, nextState: { ...nextState, floor: floor ?? now } };
    },
    output: spec.output,
    sample: spec.sample,
  };
}

/**
 * Small bounded collection (brief 9.1 c): the company-level list is read whole and compared check
 * to check; only added rows fire. `pollSnapshot` throws past 5000 rows rather than compare a
 * partial list.
 */
export function bounded(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  output: TriggerDefinition["output"];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    async poll({ state }, ctx: HookContext) {
      const result = await spec.action.execute({ returnAll: true }, ctx) as Item[];
      const rows = (Array.isArray(result) ? result : []).map((item) => ({
        key: String(item.id ?? ""),
        values: item,
      }));
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
    output: spec.output,
    sample: spec.sample,
  };
}
