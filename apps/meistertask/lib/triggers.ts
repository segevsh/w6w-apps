import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

type Item = Record<string, unknown>;
type Params = Record<string, unknown>;

/** MeisterTask page size: vendor maximum is 500, 100 keeps one check cheap. */
const PAGE_SIZE = 100;
/** 50 pages x 100 rows, the kit's 5000-row ceiling. */
const SNAPSHOT_PAGES = 50;

const asItems = (result: unknown): Item[] => Array.isArray(result) ? result as Item[] : [];

/** A required numeric id param; throws a message naming it when unset or not a positive integer. */
export function idParam(params: Params, key: string, label: string): number {
  const n = Number(params[key]);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Set ${label} before this trigger can poll.`);
  return n;
}

const guard = (specParams: Param[] | undefined, trigger: TriggerDefinition): TriggerDefinition => {
  const poll = trigger.poll!;
  return {
    ...trigger,
    poll: async (input, ctx) => {
      const p = (input.params ?? {}) as Params;
      for (const param of specParams ?? []) {
        if (param.required) idParam(p, param.key, param.label);
      }
      return await poll(input, ctx);
    },
  };
};

/**
 * Newest-first feed (brief 9.1 a): the wrapped list action is asked for `sort=-id` (MeisterTask's
 * documented descending sort, https://developers.meistertask.com/reference/sorting), page 1 of
 * 100, and the first check only seeds. `sort` may be another documented attribute, e.g.
 * `-updated_at`, when `idOf` carries the stamp so an edit is a new event.
 */
export function newestFirst(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params: Param[];
  /** Extra action input besides `items`, `page` and `sort` (path ids come from `params`). */
  input(params: Params): Params;
  sort?: string;
  idOf(item: Item): string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return guard(
    spec.params,
    pollFromListAction<Params>({
      key: spec.key,
      title: spec.title,
      description: spec.description,
      action: spec.action as unknown as ActionDefinition,
      input: (params) => ({
        ...spec.input(params ?? {}),
        items: PAGE_SIZE,
        page: 1,
        sort: spec.sort ?? "-id",
      }),
      items: asItems,
      idOf: (item) => spec.idOf(item as Item),
      params: spec.params,
      output: spec.output,
      sample: spec.sample,
      maxPages: 1,
    }),
  );
}

/**
 * Bounded collection (brief 9.1 c): the list endpoint takes no paging, so the whole answer is read
 * and compared check to check; only added rows fire. More than 5000 rows is refused.
 */
export function boundedList(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  params?: Param[];
  input?(params: Params): Params;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return guard(spec.params, {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx: HookContext) {
      const input = spec.input?.((params ?? {}) as Params) ?? {};
      const all = asItems(await spec.action.execute(input as never, ctx));
      if (all.length > SNAPSHOT_PAGES * PAGE_SIZE) {
        throw new Error(
          `${spec.title} cannot compare more than ${SNAPSHOT_PAGES * PAGE_SIZE} rows.`,
        );
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
  });
}
