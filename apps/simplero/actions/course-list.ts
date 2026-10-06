import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  siteId?: number;
  publishStatus?: "draft" | "published" | "scheduled" | "drip";
}

export default listAction<Input>({
  key: "course-list",
  resource: "course",
  title: "List Courses",
  description: "List the account's courses, optionally for one site or one publish status.",
  path: "/courses",
  itemsLabel: "Courses",
  params: [
    {
      key: "siteId",
      label: "Site ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only courses on this member site.",
    },
    {
      key: "publishStatus",
      label: "Publish status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
        { value: "scheduled", label: "Scheduled" },
        { value: "drip", label: "Drip" },
      ],
    },
  ],
  query: (i) => ({ site_id: i.siteId, publish_status: i.publishStatus }),
});
