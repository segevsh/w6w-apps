import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  categoryId: number;
}

const categoryGet: ActionDefinition<Input> = {
  key: "category-get",
  type: "read",
  resource: "category",
  title: "Get Category",
  description: "Fetch one category with its courses.",
  params: [
    { key: "categoryId", label: "Category ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("categories", {
      id: input.categoryId,
    });
  },
};

export default categoryGet;
