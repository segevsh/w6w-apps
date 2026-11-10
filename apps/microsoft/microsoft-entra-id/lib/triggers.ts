import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

/** Pages read per check by a snapshot trigger; more than this fails loudly. */
export const SNAPSHOT_MAX_PAGES = 5;
/** `$top` for collections whose reference allows 999. */
export const SNAPSHOT_TOP = 999;

interface Listed {
  value?: unknown[];
  nextLink?: string;
}

const idOf = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** Newest-first directory list ordered by `createdDateTime desc` (page 1 is the feed). */
export function createdDescTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  select: string[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition<P> {
  return pollFromListAction<P>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action as unknown as ActionDefinition,
    input: () => ({
      top: 100,
      orderby: "createdDateTime desc",
      select: spec.select,
      advancedQuery: true,
    }),
    items: (result) => (result as Listed).value ?? [],
    idOf,
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  }) as TriggerDefinition<P>;
}

/**
 * "New <record>" over a small collection: read it whole (`all`, at most SNAPSHOT_MAX_PAGES pages)
 * through the wrapped list action and diff the ids (`pollSnapshot`, added only). A collection
 * that does not fit throws a clear error instead of silently diffing a truncated list.
 */
export function snapshotTrigger<P extends Record<string, unknown>>(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never, never>;
  params?: TriggerDefinition<P>["params"];
  /** Extra action input derived from the trigger params (always includes `all`/`maxPages`). */
  input(params: P): Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ params, state }, ctx: HookContext) {
      const res = await (spec.action as unknown as ActionDefinition).execute(
        { ...spec.input(params), all: true, maxPages: SNAPSHOT_MAX_PAGES },
        ctx,
      ) as Listed;
      if (res.nextLink) {
        throw new Error(
          `Microsoft Entra ID: ${spec.title} read ${SNAPSHOT_MAX_PAGES} pages and Graph has more; the collection is too large to snapshot`,
        );
      }
      const byId = new Map<string, unknown>();
      for (const item of res.value ?? []) {
        const id = idOf(item);
        if (id === "") {
          throw new Error(`Microsoft Entra ID: ${spec.title} got an item without an id`);
        }
        byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

const DIRECTORY_OBJECT_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Object ID" },
  { key: "@odata.type", type: "string", label: "Object type" },
  { key: "displayName", type: "string", label: "Display name" },
];

export const MEMBER_OUTPUT: OutputField[] = [
  ...DIRECTORY_OBJECT_OUTPUT,
  { key: "userPrincipalName", type: "string", label: "User principal name (users)" },
  { key: "mail", type: "string", label: "Mail" },
];
