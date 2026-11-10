import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/**
 * Keys a trigger never writes into run history: the invitation accept link (`url`, which carries the
 * sign-up ticket) and any session token Clerk may attach.
 */
const SECRET_KEYS = new Set(["url", "last_active_token", "token"]);

function strip(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !SECRET_KEYS.has(k)));
  }
  return value;
}

/**
 * "New <record>" over a Clerk list that is newest-first (documented default order, or `order_by`
 * `-created_at`): page 1 of 100 through the app's own list action, de-duplicated by id.
 */
export function clerkNewest(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  params?: Param[];
  /** The list action's input for these trigger params (limit 100, newest first). */
  input(params: Record<string, unknown>): Record<string, unknown>;
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return pollFromListAction<Record<string, unknown>>({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    params: spec.params,
    input: (params) => ({ ...spec.input(params), limit: 100, offset: 0 }),
    items: (result) => ((result as { data?: unknown[] }).data ?? []).map(strip),
    idOf: (item) => {
      const id = (item as { id?: unknown }).id;
      if (typeof id !== "string" || !id) throw new Error("Clerk list returned a record without id");
      return id;
    },
    output: spec.output,
    sample: spec.sample,
    maxPages: 1,
  });
}

export const ORGANIZATION_PARAM: Param = {
  key: "organizationId",
  label: "Organization ID",
  type: "string",
  required: true,
  placeholder: "org_2abc123",
  hint: "The organization to watch.",
};
