import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "staff-get",
  resource: "staff",
  path: "/staff",
  idKey: "staffId",
  idLabel: "Staff ID",
  title: "Get Staff Member",
  description: "Fetch one staff member by id.",
});
