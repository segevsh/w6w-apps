import type { ActionDefinition } from "@w6w/types";
import { AvomaClient } from "../lib/client.ts";
import { seg } from "../lib/params.ts";

/** `GET /v1/scorecards/{uuid}/` — one scorecard template. */
interface Input {
  scorecardUuid: string;
}

const scorecardGet: ActionDefinition<Input> = {
  key: "scorecard-get",
  type: "read",
  resource: "scorecard",
  title: "Get Scorecard",
  description: "Fetch one scorecard template with its questions and answer choices.",
  params: [{ key: "scorecardUuid", label: "Scorecard UUID", type: "string", required: true }],
  output: [
    { key: "uuid", type: "string", label: "Scorecard UUID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "is_ai", type: "boolean", label: "Scored by AI" },
    { key: "state", type: "string", label: "State" },
    { key: "questions", type: "array", label: "Questions" },
  ],

  execute(input, ctx) {
    return new AvomaClient(ctx).get(`/v1/scorecards/${seg(input.scorecardUuid, "scorecardUuid")}/`);
  },
};

export default scorecardGet;
