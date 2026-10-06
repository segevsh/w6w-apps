import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  resourceType?: string;
  resourceId?: number;
  accessState?: string;
}

export default listAction<Input>({
  key: "access-grant-list",
  resource: "access-grant",
  title: "List Access Grants",
  description:
    "List access grants — which contact has been given access to which course, site or other " +
    "resource, with the start and end of that access.",
  path: "/access_grants",
  itemsLabel: "Access grants",
  search: false,
  params: [
    {
      key: "resourceType",
      label: "Resource type",
      type: "string",
      hint: "The resource's type name as Simplero returns it in `resource_type` on a grant. " +
        "Simplero's spec does not enumerate the values.",
    },
    {
      key: "resourceId",
      label: "Resource ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Only grants for this resource id (normally paired with Resource type).",
    },
    {
      key: "accessState",
      label: "Access state",
      type: "string",
      hint: "Filter by access state. Simplero's spec does not enumerate the values.",
    },
  ],
  query: (i) => ({
    resource_type: i.resourceType,
    resource_id: i.resourceId,
    access_state: i.accessState,
  }),
});
