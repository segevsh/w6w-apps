import { listAction } from "../lib/actions.ts";

export default listAction({
  "key": "staff-list",
  "noun": "staff members",
  "path": "/staffs",
  "scope": "staffs.read",
  "orders": [
    "id",
    "name",
  ],
});
