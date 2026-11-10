import type { ActionDefinition, Param } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import dealsList from "../actions/deals-list.ts";

/**
 * Newest-first poll (brief 9.1 a). `POST /crm/v1/deals/get-list` takes `sortBy: {fieldName,
 * direction}`; `fieldName` accepts `createdAt` and `updatedAt`, and the default is `createdAt`
 * ascending (https://api.sendpulse.com/.well-known/openapi/crm.yaml, `DealSearchRequest.sortBy`).
 * `pipelineIds` is required by the endpoint, so the pipeline is a required param.
 */
export default pollFromListAction<{ pipelineId: number }>({
  key: "new-deal",
  title: "New Deal",
  description: "The run gets each deal newly created in the selected CRM pipeline.",
  action: dealsList as unknown as ActionDefinition,
  input: ({ pipelineId }) => ({
    pipelineId,
    limit: 100,
    offset: 0,
    sortField: "createdAt",
    sortDirection: "desc",
  }),
  params: [
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "number",
      required: true,
      hint: "From `pipelines-list`.",
    },
  ] as Param[],
  items: (res) => (res as { data?: unknown[] })?.data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "pipelineId", type: "number", label: "Pipeline ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 4101,
    pipelineId: 1201,
    name: "Website redesign",
    status: 0,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-09T09:00:00.000Z",
  },
});
