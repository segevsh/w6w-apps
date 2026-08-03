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
  include?: string;
}

const listSequences: ActionDefinition<Input> = {
  key: "list-sequences",
  type: "read",
  resource: "sequence",
  title: "List Sequences",
  description:
    "List the account's sequences with their schedule defaults and the `active` / `repeat` / `hold` toggles, one cursor page at a time.",
  params: [
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated extra data. Only `stats` is supported.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "sequences", type: "array", label: "Sequences" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new KitClient(ctx).request<KitList<"sequences">>("/sequences", {
      query: { ...pageQuery(input), include: input.include },
    });
  },
};

export default listSequences;
