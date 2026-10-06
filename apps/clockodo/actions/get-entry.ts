import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const getEntry: ActionDefinition<Input> = {
  key: "get-entry",
  type: "read",
  resource: "entry",
  title: "Get Time Entry",
  description: "Read one time entry by id (GET /v2/entries/{id}).",
  params: [
    {
      key: "id",
      label: "Entry ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "entry", type: "object", label: "The time entry" },
  ],

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v2/entries/${id}`);
    return { entry: body.entry ?? null };
  },
};

export default getEntry;
