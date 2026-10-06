import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, datapointPath, mapDatapoint } from "../lib/client.ts";
import { DATAPOINT_OUTPUT, SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  id: string;
}

/** `DELETE /users/u/goals/g/datapoints/id.json` */
const deleteDatapoint: ActionDefinition<Input> = {
  key: "delete-datapoint",
  type: "perform",
  resource: "datapoint",
  title: "Delete Datapoint",
  description: "Delete a datapoint and return the deleted object.",
  idempotent: false,
  params: [
    USERNAME,
    SLUG,
    { key: "id", label: "Datapoint ID", type: "string", required: true },
  ],
  output: DATAPOINT_OUTPUT,

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${datapointPath(input.username, input.slug, input.id)}.json`,
      { method: "DELETE" },
    );
    return mapDatapoint(data);
  },
};

export default deleteDatapoint;
