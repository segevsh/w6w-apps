import type { ActionDefinition, TriggerDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

/**
 * Newest-first "New <record>" poll over a Bannerbear v5 list endpoint.
 *
 * Bannerbear's v5 reference (https://developers.bannerbear.com/v5/, verified 2026-11-10) says the
 * tool-job list is "newest first, 20 per page" and "uses the same polling shape as the other list
 * endpoints, so integration triggers can dedupe by uid and stop once they reach a [record] they've
 * already seen". Every list takes only `page` (25 items per page) and every record carries a `uid`,
 * so page 1 is read and unseen uids are emitted; no page-size is sent.
 */
export function newestFirst(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  output?: { key: string; type: "string"; label: string }[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  return pollFromListAction({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    input: () => ({ page: 1 }),
    items: (result) => Array.isArray(result) ? result : [],
    idOf: (item) => String((item as { uid?: unknown }).uid ?? ""),
    output: spec.output ?? [
      { key: "uid", type: "string", label: "UID" },
      { key: "created_at", type: "string", label: "Created at" },
    ],
    sample: spec.sample,
    maxPages: 1,
  });
}
