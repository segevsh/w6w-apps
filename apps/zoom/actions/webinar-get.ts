import type { ActionDefinition } from "@w6w/types";
import { ZoomClient } from "../lib/client.ts";

const webinarGet: ActionDefinition<{ webinarId: string }> = {
  key: "webinar-get",
  type: "read",
  resource: "webinar",
  title: "Get Webinar",
  description: "Fetch a webinar by id.",
  params: [{ key: "webinarId", label: "Webinar ID", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Webinar ID" },
    { key: "topic", type: "string", label: "Topic" },
    { key: "start_time", type: "string", label: "Start time" },
    { key: "join_url", type: "string", label: "Join URL" },
  ],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(`/webinars/${encodeURIComponent(input.webinarId)}`);
  },
};

export default webinarGet;
