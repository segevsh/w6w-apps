import type { ActionDefinition } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /api/v1/bulk_sends/{id}` — verified against SignWell's OpenAPI document (`getBulkSend`).
 */
const bulkSendGet: ActionDefinition = {
  key: "bulk-send-get",
  type: "read",
  resource: "bulk-send",
  title: "Get a Bulk Send",
  description: "Read one bulk send — status, how many documents completed, and its templates.",
  params: [idParam("Bulk send id")],
  output: [
    { key: "id", type: "string", label: "Bulk send id" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "documents_count", type: "number", label: "Documents in the bulk send" },
    { key: "documents_completed", type: "number", label: "Documents completed" },
    { key: "documents_not_completed", type: "number", label: "Documents not completed" },
    { key: "templates", type: "array", label: "Templates used" },
    { key: "created_at", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const id = requireId((input as { id?: unknown }).id);
    ctx.log("info", "getting a SignWell bulk send", { id });
    return await new SignWellClient(ctx).request(`/bulk_sends/${encodeURIComponent(id)}`);
  },
};

export default bulkSendGet;
