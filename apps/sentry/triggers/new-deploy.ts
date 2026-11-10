import type { TriggerDefinition } from "@w6w/types";
import deployList from "../actions/deploy-list.ts";
import { ORG_PARAM } from "../lib/params.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /api/0/organizations/{org}/releases/{version}/deploys/` lists the deploys of one release (a handful per release), cursor-paged with no sort or date filter (https://docs.sentry.io/api/releases/list-a-releases-deploys/, verified 2026-11-10).
 * Every check reads the whole list through `deploy-list` (`returnAll`) and diffs the ids
 * (`pollSnapshot`, added only).
 */
const trigger: TriggerDefinition = {
  key: "new-deploy",
  title: "New Deploy",
  description: "The run gets each deploy newly recorded against one Sentry release.",
  params: [
    ORG_PARAM,
    {
      key: "version",
      label: "Release version",
      type: "string",
      required: true,
      placeholder: "backend@1.4.0",
      hint: "The release whose deploys to watch.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deploy ID" },
    { key: "environment", type: "string", label: "Environment" },
    { key: "version", type: "string", label: "Release version" },
    { key: "dateStarted", type: "string", label: "Started at" },
    { key: "dateFinished", type: "string", label: "Finished at" },
  ],
  sample: {
    id: "6",
    environment: "production",
    version: "backend@1.4.0",
    dateStarted: "2026-11-10T09:00:00Z",
    dateFinished: "2026-11-10T09:05:00Z",
  },
  minIntervalMs: 300_000,
  async poll({ state, params }, ctx) {
    const p = (params ?? {}) as Record<string, unknown>;
    const items = await deployList.execute({
      organizationSlug: p.organizationSlug,
      version: p.version,
      returnAll: true,
    }, ctx);
    return newRecords({
      state,
      items: Array.isArray(items) ? items : [],
      idOf: (item) => (item as { id?: unknown }).id,
    });
  },
};

export default trigger;
