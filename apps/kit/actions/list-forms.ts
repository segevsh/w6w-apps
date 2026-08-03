import type { ActionDefinition } from "@w6w/types";
import {
  KitClient,
  type KitList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  status?: "active" | "archived" | "trashed" | "all";
  type?: "embed" | "hosted";
  include?: string;
}

const listForms: ActionDefinition<Input> = {
  key: "list-forms",
  type: "read",
  resource: "form",
  title: "List Forms",
  description:
    "List forms and landing pages, one cursor page at a time. Defaults to `active` forms.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "trashed", label: "Trashed" },
        { value: "all", label: "All" },
      ],
      hint: "Kit defaults to `active` when omitted.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "embed", label: "Embedded form" },
        { value: "hosted", label: "Landing page" },
      ],
    },
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated extra fields. Only `subscriber_count` is supported.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "forms", type: "array", label: "Forms" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new KitClient(ctx).request<KitList<"forms">>("/forms", {
      query: {
        ...pageQuery(input),
        status: input.status,
        type: input.type,
        include: input.include,
      },
    });
  },
};

export default listForms;
