import type { ActionDefinition } from "@w6w/types";
import {
  KitClient,
  type KitList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

type Input = PageInput;

const listCustomFields: ActionDefinition<Input> = {
  key: "list-custom-fields",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description:
    "List the account's custom fields, one cursor page at a time. Each carries the `key` that Create Subscriber and Update Subscriber expect under `fields`.",
  params: [...PAGE_PARAMS],
  output: [
    { key: "custom_fields", type: "array", label: "Custom fields" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new KitClient(ctx).request<KitList<"custom_fields">>("/custom_fields", {
      query: pageQuery(input),
    });
  },
};

export default listCustomFields;
