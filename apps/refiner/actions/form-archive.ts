import type { ActionDefinition } from "@w6w/types";
import { RefinerClient } from "../lib/client.ts";

interface Input {
  formUuid: string;
}

const formArchive: ActionDefinition<Input> = {
  key: "form-archive",
  type: "perform",
  resource: "form",
  title: "Archive Survey",
  description: "Archive a survey. The vendor archives rather than deletes it.",
  idempotent: true,
  params: [{ key: "formUuid", label: "Survey UUID", type: "string", required: true }],
  output: [{ key: "message", type: "string", label: "Vendor confirmation" }],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/forms", {
      method: "DELETE",
      query: { form_uuid: input.formUuid },
    });
  },
};

export default formArchive;
