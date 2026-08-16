import type { ActionDefinition } from "@w6w/types";
import { bareId, LinkedInAdsClient } from "../lib/client.ts";

interface Input {
  segmentId: string;
}

/** `GET /rest/dmpSegments/{id}` — fetch one DMP (Matched Audiences) segment by its numeric id. */
const audienceSegmentGet: ActionDefinition<Input> = {
  key: "audience-segment-get",
  type: "read",
  resource: "audience-segment",
  title: "Get Audience Segment",
  description: "Fetch one Matched Audiences (DMP) segment by ID.",
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      required: true,
      hint: "The numeric DMP segment id.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Content type" },
    { key: "inputCount", type: "number", label: "Input entities pushed by the source platform" },
    { key: "destinations", type: "array", label: "Destinations (status, destinationSegmentId)" },
  ],

  execute(input, ctx) {
    const client = new LinkedInAdsClient(ctx);
    return client.request(`/rest/dmpSegments/${bareId(input.segmentId)}`);
  },
};

export default audienceSegmentGet;
