import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  id: string;
}

const financialYearGet: ActionDefinition<Input> = {
  key: "financial-year-get",
  type: "read",
  resource: "financial-year",
  title: "Get Financial Year",
  description: "Fetch one financial year by its numeric id.",
  params: [
    {
      "key": "id",
      "label": "Financial year id",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "FinancialYear",
      "type": "object",
      "label": "Financial Year record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/financialyears/${seg(input.id)}`);
  },
};

export default financialYearGet;
