import { listAction } from "../lib/actions.ts";

export default listAction({
  key: "company-list",
  resource: "company",
  path: "/companies",
  title: "List Companies",
  description:
    "List companies. Search covers name, website, phone and fax; filters include `standing`, `manager_id`, `custom_id` and `date_created`.",
  filterHint: "e.g. `standing(active)`, `manager_id(14)`.",
});
