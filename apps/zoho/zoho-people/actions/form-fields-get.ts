import type { ActionDefinition } from "@w6w/types";
import { identifier, peopleGet } from "../lib/people.ts";
import { formLinkName, resultOutput } from "../lib/params.ts";

interface Input {
  formLinkName: string;
}

const formFieldsGet: ActionDefinition<Input> = {
  key: "form-fields-get",
  type: "read",
  resource: "form",
  title: "Get Form Fields",
  description:
    "List the field components of a form (label name, type, mandatory flag) — the names to use in record-create and record-update.",
  params: [formLinkName],
  output: resultOutput,

  async execute(input, ctx) {
    return await peopleGet(ctx, `/forms/${identifier(input.formLinkName)}/components`);
  },
};

export default formFieldsGet;
