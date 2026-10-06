import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const getAbsence: ActionDefinition<Input> = {
  key: "get-absence",
  type: "read",
  resource: "absence",
  title: "Get Absence",
  description: "Read one absence by id (GET /v4/absences/{id}).",
  params: [
    {
      key: "id",
      label: "Absence ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "Absence" },
  ],

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v4/absences/${id}`);
    return { data: body.data ?? null };
  },
};

export default getAbsence;
