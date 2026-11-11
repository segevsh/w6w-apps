import type { ActionDefinition, HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { accountIdParam, companyIdParam } from "./params.ts";

/** Params every account-scoped CallRail trigger takes. */
export const accountParams: Param[] = [accountIdParam, companyIdParam];

/** Largest page CallRail's list endpoints accept (`per_page` max 250, https://apidocs.callrail.com/). */
const PER_PAGE = 250;
/** 20 pages x 250 rows = 5000, the `pollSnapshot` row cap. */
const MAX_PAGES = 20;

interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** Key of the record array in the list action's result (`companies`, `trackers`, `tags`). */
  listKey: string;
  /** Whether the list action takes a `companyId` filter. */
  withCompany: boolean;
  output: TriggerDefinition["output"];
  sample: unknown;
}

/**
 * "New <record>" for a CallRail collection that can only be sorted by name (companies, trackers,
 * tags): an account's set is small, so every check reads the whole set (name-ordered, 250 per
 * page, up to 20 pages) through the SAME list action and diffs the ids (`pollSnapshot`, added only).
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 300_000,
    params: spec.withCompany ? accountParams : [accountIdParam],
    output: spec.output,
    sample: spec.sample,
    async poll({ params, state }, ctx: HookContext) {
      const rows: Record<string, unknown>[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const input: Record<string, unknown> = {
          accountId: params.accountId,
          sort: "name",
          order: "asc",
          page,
          perPage: PER_PAGE,
        };
        if (spec.withCompany && params.companyId) input.companyId = params.companyId;
        const out = await spec.action.execute!(input, ctx) as Record<string, unknown>;
        rows.push(...((out[spec.listKey] as Record<string, unknown>[] | undefined) ?? []));
        if (page >= Number(out.totalPages ?? 1)) break;
        if (page === MAX_PAGES) {
          throw new Error(
            `${spec.key}: more than ${MAX_PAGES * PER_PAGE} records; narrow by company`,
          );
        }
      }
      const byId = new Map(rows.map((r) => [String(r.id), r]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { id: key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}
