import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `POST /1/emailmarketing/addtag.json` — Add tag(s) to a contact.
 */
interface Input {
  email: string;
  id?: string;
  tagname: string;
}

const tagAdd: ActionDefinition<Input> = {
  key: "tag-add",
  type: "perform",
  resource: "tag",
  title: "Add Tag",
  description: "Add tag(s) to a contact.",
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
      hint: "Tag(s) to add.",
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
    return await new VboutClient(ctx).post("emailmarketing/addtag", {
      email: input.email,
      id: input.id,
      tagname: input.tagname,
    });
  },
};

export default tagAdd;
