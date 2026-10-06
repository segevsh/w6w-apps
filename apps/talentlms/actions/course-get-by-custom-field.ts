import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  customFieldValue: string;
}

const courseGetByCustomField: ActionDefinition<Input> = {
  key: "course-get-by-custom-field",
  type: "search",
  resource: "course",
  title: "Get Courses by Custom Field",
  description: "Find courses whose custom field holds a value.",
  params: [
    {
      key: "customFieldValue",
      label: "Value",
      type: "string",
      required: true,
      hint: "Dates use the dash format, e.g. 11-6-2019. Commas are not supported.",
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("getcoursesbycustomfield", {
      custom_field_value: input.customFieldValue,
    });
  },
};

export default courseGetByCustomField;
