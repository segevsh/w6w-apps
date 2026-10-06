import type { ActionDefinition } from "@w6w/types";
import { RefinerClient } from "../lib/client.ts";

interface Input {
  formUuid: string;
  published?: boolean;
}

const formPublish: ActionDefinition<Input> = {
  key: "form-publish",
  type: "perform",
  resource: "form",
  title: "Publish or Unpublish Survey",
  description: "Publish an existing survey, or unpublish it by turning Published off.",
  idempotent: true,
  params: [
    {
      key: "formUuid",
      label: "Survey UUID",
      type: "string",
      required: true,
      hint: "From List Surveys, or from the survey editor URL.",
    },
    { key: "published", label: "Published", type: "boolean", default: true },
  ],
  output: [{ key: "message", type: "string", label: "Vendor confirmation" }],

  async execute(input, ctx) {
    return await new RefinerClient(ctx).json("/forms/publish", {
      method: "POST",
      body: { form_uuid: input.formUuid, published: input.published === false ? 0 : 1 },
    });
  },
};

export default formPublish;
