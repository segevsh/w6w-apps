import { boundedList } from "../lib/triggers.ts";
import muralUserList from "../actions/mural-user-list.ts";

export default boundedList({
  key: "new-mural-user",
  title: "New Mural User",
  description: "The run gets each user newly given access to one mural.",
  action: muralUserList as never,
  params: [{
    key: "muralId",
    label: "Mural ID",
    type: "string",
    required: true,
    hint: "The mural to watch, e.g. from List Murals.",
  }],
  input: (p) => ({ muralId: p.muralId }),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "u-1", firstName: "Ana", lastName: "Silva", email: "ana@example.com" },
});
