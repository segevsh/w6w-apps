import type { ActionDefinition } from "@w6w/types";
import { identifier, peopleGet } from "../lib/people.ts";
import { formLinkName, resultOutput } from "../lib/params.ts";

interface Input {
  formLinkName: string;
}

const formViewsList: ActionDefinition<Input> = {
  key: "form-views-list",
  type: "read",
  resource: "form",
  title: "List Form Views",
  description: "List the views of a form — the `viewName` values List Records By View needs.",
  params: [formLinkName],
  output: resultOutput,

  async execute(input, ctx) {
    return await peopleGet(ctx, `/forms/${identifier(input.formLinkName)}/views`);
  },
};

export default formViewsList;
