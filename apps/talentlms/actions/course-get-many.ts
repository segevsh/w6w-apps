import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const courseGetMany: ActionDefinition<Record<string, never>> = {
  key: "course-get-many",
  type: "read",
  resource: "course",
  title: "Get Many Courses",
  description: "List every course in the domain.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("courses");
  },
};

export default courseGetMany;
