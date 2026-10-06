import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/removetag.json` — Remove tag(s) from a contact.
 */
interface Input {
  email: string;
  id?: string;
  tagname: string;
}

const tagRemove: ActionDefinition<Input> = {
  key: "tag-remove",
  type: "perform",
  resource: "tag",
  title: "Remove Tag",
  description: "Remove tag(s) from a contact.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Contact Email",
      type: "string",
      required: true,
    },
    {
      key: "id",
      label: "Contact ID",
      type: "string",
    },
    {
      key: "tagname",
      label: "Tag Name",
      type: "string",
      required: true,
      hint: "Tag(s) to remove.",
    },
  ],
  output: [
    {
      key: "ok",
      type: "boolean",
      label:
        "True when VBOUT accepted the request. Any fields VBOUT returns for the record (e.g. a created record's details) are merged in.",
    },
  ],

  async execute(input, ctx) {
    return await new VboutClient(ctx).post("emailmarketing/removetag", {
      email: input.email,
      id: input.id,
      tagname: input.tagname,
    });
  },
};

export default tagRemove;
