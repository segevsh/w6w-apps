import type { ActionDefinition } from "@w6w/types";
import { call, pick, requireArray, V1 } from "../lib/client.ts";
import { prospectsParam, str } from "../lib/params.ts";

type Input = {
  file_name?: string;
  prospects: unknown[] | string;
};

const prospectAdd: ActionDefinition<Input> = {
  key: "prospect-add",
  type: "perform",
  resource: "prospect",
  title: "Add Prospects",
  description:
    "Add prospects to the account's prospect database (up to 20,000 per request). Existing emails come back as duplicates.",
  idempotent: false,
  params: [
    str("file_name", "Import batch name", { hint: "Shown in the imported column." }),
    prospectsParam,
  ],
  output: [
    {
      key: "prospects",
      type: "array",
      label: "Per-prospect result: email, id, duplicate flag or error",
    },
    { key: "status", type: "object", label: "Overall status block" },
  ],

  async execute(input, ctx) {
    const body = {
      ...pick(input, ["file_name"]),
      prospects: requireArray("prospects", input.prospects, 20000),
    };
    return (await call(ctx, "POST", V1, "/add_prospects_list", { body })) as Record<
      string,
      unknown
    >;
  },
};

export default prospectAdd;
