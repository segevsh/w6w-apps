import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  activityId: number;
}

const activityGet: ActionDefinition<Input> = {
  key: "activity-get",
  type: "read",
  resource: "activity",
  title: "Get Activity",
  description: "Fetch a activity by id.",
  params: [idParam("activityId", "Activity ID")],
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/activity/v4/${input.activityId}`,
    );
    return data ?? {};
  },
};

export default activityGet;
