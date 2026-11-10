import { idOf, snapshotTrigger } from "../lib/triggers.ts";
import queueList from "../actions/queue-list.ts";

/**
 * Bounded collection (brief 9.1 c): an organisation has a few queues and `GET /v1/queues`
 * returns all of them in one response (https://docs.dixa.io/openapi/dixa-api/v1/ , verified
 * 2026-11-10).
 */
export default snapshotTrigger({
  key: "new-queue",
  title: "New Queue",
  description: "The run gets each queue newly created in the Dixa organisation.",
  output: [
    { key: "id", type: "string", label: "Queue ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isDefault", type: "boolean", label: "Is default queue" },
    { key: "organizationId", type: "string", label: "Organisation ID" },
  ],
  sample: {
    id: "3f1b8c2d-6a4e-4d7b-9c05-1e2f3a4b5c6d",
    name: "Support",
    isDefault: false,
    organizationId: "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d",
  },
  fetchRows: async (_params, ctx) => {
    const out = await queueList.execute({}, ctx) as { data?: unknown[] };
    return out.data ?? [];
  },
  idOf,
});
