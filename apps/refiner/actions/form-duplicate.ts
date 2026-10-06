import type { ActionDefinition } from "@w6w/types";
import { RefinerClient } from "../lib/client.ts";

interface Input {
  formUuid: string;
  name: string;
}

const formDuplicate: ActionDefinition<Input> = {
  key: "form-duplicate",
  type: "perform",
  resource: "form",
  title: "Duplicate Survey",
  description: "Copy a survey into a new draft with the given name.",
  idempotent: false,
  params: [
    { key: "formUuid", label: "Survey UUID", type: "string", required: true },
    { key: "name", label: "New survey name", type: "string", required: true },
  ],
  output: [
    { key: "source_form_uuid", type: "string", label: "Source survey UUID" },
    { key: "new_form_uuid", type: "string", label: "New survey UUID" },
  ],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/forms/duplicate", {
      method: "POST",
      body: { form_uuid: input.formUuid, name: input.name },
    });
  },
};

export default formDuplicate;
