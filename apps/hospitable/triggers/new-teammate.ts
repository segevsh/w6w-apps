import { boundedList } from "../lib/triggers.ts";
import teammateList from "../actions/teammate-list.ts";

export default boundedList({
  key: "new-teammate",
  title: "New Teammate",
  description: "The run gets each teammate newly added to the Hospitable account.",
  action: teammateList as never,
  paged: true,
  output: [
    { key: "id", type: "string", label: "Teammate UUID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "teammate-1", first_name: "Ana", last_name: "Silva", email: "ana@example.com" },
});
