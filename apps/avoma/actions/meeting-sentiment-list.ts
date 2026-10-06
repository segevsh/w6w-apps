import type { ActionDefinition } from "@w6w/types";
import { AvomaClient, toPage } from "../lib/client.ts";
import { pageOutput, seg } from "../lib/params.ts";

/** `GET /v1/meeting_sentiments/?meeting_uuid=` — sentiment score and time ranges. */
interface Input {
  meetingUuid: string;
}

const meetingSentimentList: ActionDefinition<Input> = {
  key: "meeting-sentiment-list",
  type: "read",
  resource: "meeting",
  title: "Get Meeting Sentiments",
  description: "Overall sentiment and per-time-range sentiment scores for a meeting.",
  params: [{ key: "meetingUuid", label: "Meeting UUID", type: "string", required: true }],
  output: pageOutput,

  async execute(input, ctx) {
    seg(input.meetingUuid, "meetingUuid");
    return toPage(
      await new AvomaClient(ctx).get("/v1/meeting_sentiments/", {
        meeting_uuid: input.meetingUuid.trim(),
      }),
    );
  },
};

export default meetingSentimentList;
