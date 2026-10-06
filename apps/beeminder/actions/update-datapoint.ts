import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, datapointPath, mapDatapoint } from "../lib/client.ts";
import { DATAPOINT_OUTPUT, SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  id: string;
  value?: number;
  timestamp?: number;
  comment?: string;
}

/** `PUT /users/u/goals/g/datapoints/id.json` */
const updateDatapoint: ActionDefinition<Input> = {
  key: "update-datapoint",
  type: "perform",
  resource: "datapoint",
  title: "Update Datapoint",
  description: "Change a datapoint's value, timestamp or comment.",
  idempotent: true,
  params: [
    USERNAME,
    SLUG,
    { key: "id", label: "Datapoint ID", type: "string", required: true },
    { key: "value", label: "Value", type: "number" },
    { key: "timestamp", label: "Timestamp (unix seconds)", type: "number" },
    { key: "comment", label: "Comment", type: "string" },
  ],
  output: DATAPOINT_OUTPUT,

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${datapointPath(input.username, input.slug, input.id)}.json`,
      {
        method: "PUT",
        form: { value: input.value, timestamp: input.timestamp, comment: input.comment },
      },
    );
    return mapDatapoint(data);
  },
};

export default updateDatapoint;
