import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, goalPath, mapDatapoint } from "../lib/client.ts";
import { DATAPOINT_OUTPUT, SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  value: number;
  timestamp?: number;
  daystamp?: string;
  comment?: string;
  requestid?: string;
}

/** `POST /users/u/goals/g/datapoints.json` — an upsert keyed by `requestid`. */
const createDatapoint: ActionDefinition<Input> = {
  key: "create-datapoint",
  type: "perform",
  resource: "datapoint",
  title: "Create Datapoint",
  description: "Add a datapoint to a goal. `requestid` makes it an upsert: resending the same " +
    "request id never duplicates, and a changed value updates the existing point. It defaults " +
    "to this invocation's id so a retried step is safe.",
  idempotent: true,
  params: [
    USERNAME,
    SLUG,
    { key: "value", label: "Value", type: "number", required: true },
    {
      key: "timestamp",
      label: "Timestamp (unix seconds)",
      type: "number",
      hint: "Defaults to now. Wins over `daystamp` when both are set.",
    },
    { key: "daystamp", label: "Daystamp (yyyymmdd)", type: "string" },
    { key: "comment", label: "Comment", type: "string" },
    {
      key: "requestid",
      label: "Request ID",
      type: "string",
      hint: "Idempotency key, scoped to the goal. Defaults to the invocation id.",
    },
  ],
  output: DATAPOINT_OUTPUT,

  async execute(input, ctx) {
    if (input.value === undefined || input.value === null || Number.isNaN(Number(input.value))) {
      throw new Error("value is required and must be a number");
    }
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}/datapoints.json`,
      {
        method: "POST",
        form: {
          value: input.value,
          timestamp: input.timestamp,
          daystamp: input.daystamp || undefined,
          comment: input.comment,
          requestid: input.requestid || ctx.invocation?.invocationId,
        },
      },
    );
    return mapDatapoint(data);
  },
};

export default createDatapoint;
