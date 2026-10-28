import type { ActionDefinition } from "@w6w/types";
import { AudiencesClient, normalizeNodeId } from "../lib/client.ts";

interface Input {
  audienceId: string;
  name?: string;
  description?: string;
  optOutLink?: string;
  customerFileSource?: string;
}

/**
 * `POST /{custom_audience_id}` — Meta's examples update `name` and
 * `opt_out_link`; `description` and `customer_file_source` are in the same
 * parameter table. A flagged audience (operation_status 471) rejects edits to
 * restricted fields (error subcode 1713231 / 1713228); the message is surfaced
 * verbatim.
 */
const updateCustomAudience: ActionDefinition<Input, { success?: boolean }> = {
  key: "update-custom-audience",
  type: "perform",
  resource: "custom-audience",
  idempotent: true,
  title: "Update Custom Audience",
  description: "Rename a custom audience or change its description, opt-out link or file source.",
  params: [
    { key: "audienceId", label: "Custom Audience ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "string" },
    { key: "optOutLink", label: "Opt-out link", type: "string" },
    {
      key: "customerFileSource",
      label: "Customer file source",
      type: "select",
      options: [
        { value: "USER_PROVIDED_ONLY", label: "Collected directly from customers" },
        { value: "PARTNER_PROVIDED_ONLY", label: "Sourced from partners" },
        { value: "BOTH_USER_AND_PARTNER_PROVIDED", label: "Both customers and partners" },
      ],
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const id = normalizeNodeId(input.audienceId, "Custom Audience ID");
    const form = {
      name: input.name,
      description: input.description,
      opt_out_link: input.optOutLink,
      customer_file_source: input.customerFileSource,
    };
    if (!Object.values(form).some((v) => v !== undefined && v !== "")) {
      throw new Error("Nothing to update — set at least one field");
    }
    return await new AudiencesClient(ctx).request<{ success?: boolean }>(`/${id}`, {
      method: "POST",
      form,
    });
  },
};

export default updateCustomAudience;
