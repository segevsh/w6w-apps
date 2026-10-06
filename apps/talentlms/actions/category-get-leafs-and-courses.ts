import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  categoryId: number;
}

const categoryGetLeafsAndCourses: ActionDefinition<Input> = {
  key: "category-get-leafs-and-courses",
  type: "read",
  resource: "category",
  title: "Get Category Leafs and Courses",
  description: "A category's child categories and the courses beneath them.",
  params: [
    { key: "categoryId", label: "Category ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("categoryleafsandcourses", {
      id: input.categoryId,
    });
  },
};

export default categoryGetLeafsAndCourses;
