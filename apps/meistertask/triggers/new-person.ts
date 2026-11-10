import { boundedList } from "../lib/triggers.ts";
import personList from "../actions/person-list.ts";

export default boundedList({
  key: "new-person",
  title: "New Person",
  description: "The run gets each person who newly shares a project with the authenticated user.",
  action: personList as never,
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: 7, firstname: "Ana", lastname: "Silva", email: "ana@example.com" },
});
