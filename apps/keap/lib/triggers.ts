import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;

const idOf = (item: Item, stamp?: string): string => {
  if (item.id === undefined || item.id === null || item.id === "") {
    throw new Error("Keap record has no stable id");
  }
  return stamp === undefined ? String(item.id) : `${item.id}:${String(item[stamp] ?? "")}`;
};

/**
 * A newest-first feed over a Keap v2 list action (brief 9.1 a): the action's own `order_by`
 * (`orderBy`) puts the newest record first, one literal page of 100. With `stamp`, the id is
 * `<id>:<stamp>` so an edit is a new event (brief 9.2).
 */
export function feedTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  /** The result field holding the records (`campaigns`, `orders`, ...). */
  list: string;
  /** Keap `order_by`, newest first (spellings differ per resource; see the OpenAPI document). */
  orderBy: string;
  /** Record field that changes on every edit; makes this a new-or-updated trigger. */
  stamp?: string;
  params?: Param[];
  /** Extra action input derived from the trigger's params. */
  extra?: (params: Record<string, unknown>) => Record<string, unknown>;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as unknown as ActionDefinition,
    params: spec.params,
    input: (params) => ({
      ...(spec.extra?.(params) ?? {}),
      orderBy: spec.orderBy,
      pageSize: 100,
    }),
    items: (result) => (result as Record<string, unknown>)[spec.list] as unknown[] ?? [],
    idOf: (item) => idOf(item as Item, spec.stamp),
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

/**
 * A small whole collection read in one request and diffed by id (brief 9.1 c, added only).
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  list: string;
  params?: Param[];
  extra?: (params: Record<string, unknown>) => Record<string, unknown>;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const result = await action.execute(
        spec.extra?.((params ?? {}) as Record<string, unknown>) ?? {},
        ctx,
      ) as Item;
      const items = ((result[spec.list] as Item[] | undefined) ?? []).filter((i) =>
        i.id !== undefined && i.id !== null && i.id !== ""
      );
      // The action cannot page; `truncated` means Keap held a continuation token (more rows).
      if (result.truncated) {
        throw new Error(`${spec.key}: more than one page of records; a snapshot cannot be taken`);
      }
      const byId = new Map(items.map((i) => [idOf(i), i]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((i) => ({ key: idOf(i), values: { id: i.id } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
