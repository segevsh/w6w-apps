import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  customFieldValue: string;
}

const userGetByCustomField: ActionDefinition<Input> = {
  key: "user-get-by-custom-field",
  type: "search",
  resource: "user",
  title: "Get Users by Custom Field",
  description: "Find users whose custom registration field holds a value.",
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
    return new TalentLmsClient(ctx).get("getusersbycustomfield", {
      custom_field_value: input.customFieldValue,
    });
  },
};

export default userGetByCustomField;
