import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  content: string;
  dealId?: number;
  personId?: number;
  orgId?: number;
  leadId?: string;
}

/**
 * POST /notes — create a note. `content` is required and at least one of the
 * link ids (deal/person/org/lead) should be set for the note to attach to
 * something. `lead_id` is a UUID string, unlike the numeric object ids.
 */
const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Create a note attached to a deal, person, organization or lead.",
  idempotent: false,
  params: [
    { key: "content", label: "Content", type: "text", required: true, hint: "Supports HTML." },
    { key: "dealId", label: "Deal ID", type: "number" },
    { key: "personId", label: "Person ID", type: "number" },
    { key: "orgId", label: "Organization ID", type: "number" },
    { key: "leadId", label: "Lead ID", type: "string", hint: "Lead UUID." },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Note" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    return client.request("/notes", {
      method: "POST",
      body: compact({
        content: input.content,
        deal_id: input.dealId,
        person_id: input.personId,
        org_id: input.orgId,
        lead_id: input.leadId,
      }),
    });
  },
};

export default noteCreate;
