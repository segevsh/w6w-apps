import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { iterationIdParam } from "../lib/params.ts";

interface Input {
  iterationId: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

const iterationUpdate: ActionDefinition<Input> = {
  key: "iteration-update",
  type: "perform",
  resource: "iteration",
  title: "Update Iteration",
  description: "Update an existing Iteration. Only the fields you set are changed.",
  idempotent: true,
  params: [
    iterationIdParam,
    { key: "name", label: "Name", type: "string" },
    { key: "startDate", label: "Start date", type: "date", hint: "A date, not a date-time." },
    { key: "endDate", label: "End date", type: "date", hint: "A date, not a date-time." },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [{ key: "data", type: "object", label: "The updated Iteration" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).put(
      `/iterations/${input.iterationId}`,
      compact({
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        description: input.description,
      }),
    );
  },
};

export default iterationUpdate;
