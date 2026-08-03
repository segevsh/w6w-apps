import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  segmentId: string;
}

const getSegment: ActionDefinition<Input> = {
  key: "get-segment",
  type: "read",
  resource: "segment",
  title: "Get Segment",
  description:
    "Return one segment by id: name, colour, creation date and its current active-subscriber count.",
  params: [
    { key: "segmentId", label: "Segment ID", type: "string", required: true },
  ],
  output: [{ key: "segment", type: "object", label: "Segment" }],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request(`/segments/${FlodeskClient.seg(input.segmentId)}`);
  },
};

export default getSegment;
