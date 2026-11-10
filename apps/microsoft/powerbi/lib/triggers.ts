import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listRefreshHistory from "../actions/list-refresh-history.ts";
import { groupIdParam } from "./params.ts";

interface Params {
  groupId?: string;
  datasetId: string;
}

interface Refresh {
  requestId?: unknown;
  startTime?: unknown;
  status?: unknown;
}

/** The service keeps at most 60 entries per dataset, so one request is the whole collection. */
const TOP = 60;

const refreshId = (refresh: Refresh): string =>
  String(refresh.requestId ?? refresh.startTime ?? "");

async function check(
  params: Params,
  state: unknown,
  ctx: HookContext,
  idOf: (refresh: Refresh) => string,
) {
  return await pollNewItems<Refresh>({
    state,
    idOf,
    async fetchPage() {
      const result = await listRefreshHistory.execute(
        { groupId: params.groupId, datasetId: params.datasetId, top: TOP },
        ctx,
      );
      return { items: (result.value ?? []) as Refresh[] };
    },
  });
}

const PARAMS: TriggerDefinition<Params>["params"] = [
  groupIdParam,
  { key: "datasetId", label: "Dataset ID", type: "string", required: true },
];

const OUTPUT: TriggerDefinition["output"] = [
  { key: "requestId", type: "string", label: "Refresh request ID" },
  { key: "refreshType", type: "string", label: "Refresh type" },
  { key: "status", type: "string", label: "Status (Completed, Failed, Unknown, Disabled)" },
  { key: "startTime", type: "string", label: "Start time" },
  { key: "endTime", type: "string", label: "End time" },
];

const SAMPLE = {
  requestId: "9399bb89-25d1-44f8-8576-136d7e9014b1",
  refreshType: "ViaApi",
  status: "Completed",
  startTime: "2026-11-09T10:00:00Z",
  endTime: "2026-11-09T10:02:10Z",
};

export function refreshTrigger(spec: { updated: boolean }): TriggerDefinition<Params> {
  return spec.updated
    ? {
      key: "new-or-updated-refresh",
      title: "New or Updated Dataset Refresh",
      description:
        "The run gets each dataset refresh that starts, or changes status (for example from in progress to completed or failed), since the previous check.",
      params: PARAMS,
      output: OUTPUT,
      sample: SAMPLE,
      minIntervalMs: 300_000,
      poll: ({ params, state }, ctx) =>
        check(
          params,
          state,
          ctx,
          (r) => `${refreshId(r)}:${String(r.status ?? "")}`,
        ),
    }
    : {
      key: "new-refresh",
      title: "New Dataset Refresh",
      description: "The run gets each dataset refresh that starts since the previous check.",
      params: PARAMS,
      output: OUTPUT,
      sample: SAMPLE,
      minIntervalMs: 300_000,
      poll: ({ params, state }, ctx) => check(params, state, ctx, refreshId),
    };
}
