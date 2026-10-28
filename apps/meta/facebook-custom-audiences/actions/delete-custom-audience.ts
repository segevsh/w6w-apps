import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, normalizeNodeId } from "../lib/client.ts";

interface Input {
  audienceId: string;
}

/**
 * `DELETE /{custom_audience_id}`. Permanent: "your ads using it will stop
 * running" and cannot be restarted. Meta refuses (error 2656) while lookalikes
 * built from the audience still exist.
 */
const deleteCustomAudience: ActionDefinition<Input, { success?: boolean }> = {
  key: "delete-custom-audience",
  type: "perform",
  resource: "custom-audience",
  idempotent: false,
  title: "Delete Custom Audience",
  description:
    "Permanently delete a custom audience. Ads using it stop running and cannot be restarted. Fails while lookalikes built from it exist.",
  params: [{ key: "audienceId", label: "Custom Audience ID", type: "string", required: true }],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const id = normalizeNodeId(input.audienceId, "Custom Audience ID");
    return await new AudiencesClient(ctx).request<{ success?: boolean }>(`/${id}`, {
      method: "DELETE",
    });
  },
};

export default deleteCustomAudience;
