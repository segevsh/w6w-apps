import clientUserList from "../actions/client-user-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-client-user",
  title: "New Client User",
  description: "The run gets each user newly added to the chosen client company (reseller keys).",
  action: clientUserList,
  params: [{
    key: "company_uuid",
    label: "Client company UUID",
    type: "string",
    required: true,
    hint: "UUID of one of your client companies.",
  }],
  output: [
    { key: "uuid", type: "string", label: "User UUID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { uuid: "3f2b9c1e-0000-4000-8000-000000000001", email: "bob@example.com" },
});
