import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

const courseCustomFieldsGet: ActionDefinition<Record<string, never>> = {
  key: "course-custom-fields-get",
  type: "read",
  resource: "course",
  title: "Get Custom Course Fields",
  description: "List the custom course fields defined for the domain.",
  params: [],

  execute(_input, ctx) {
    return new TalentLmsClient(ctx).get("getcustomcoursefields");
  },
};

export default courseCustomFieldsGet;
