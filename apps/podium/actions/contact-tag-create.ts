import type { ActionDefinition } from "@w6w/types";
import { compact, PodiumClient } from "../lib/client.ts";

interface Input {
  label: string;
  description: string;
}

const contactTagCreate: ActionDefinition<Input> = {
  key: "contact-tag-create",
  type: "perform",
  resource: "contact-tag",
  title: "Create Contact Tag",
  description:
    "Create an organization-level tag that can then be added to contacts. Requires scope `write_contacts`.",
  idempotent: false,
  params: [{
    key: "label",
    label: "Label",
    type: "string",
    required: true,
  }, {
    key: "description",
    label: "Description",
    type: "string",
    required: true,
  }],
  output: [{
    key: "createdAt",
    type: "string",
    label: "Time at which the resource was created. Date time is in Coordinated Un",
  }, {
    key: "description",
    type: "string",
    label: "Description of the tag",
  }, {
    key: "label",
    type: "string",
    label: "The label of the tag",
  }, {
    key: "organization",
    type: "object",
    label: "Reference to the organization resource",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for tag",
  }, {
    key: "updatedAt",
    type: "string",
    label: "Time at which the resource was updated. Date time is in Coordinated Un",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one("/contact_tags", {
      method: "POST",
      body: compact({
        label: input.label,
        description: input.description,
      }),
    });
  },
};

export default contactTagCreate;
