import clientTeamList from "../actions/client-team-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-client-team",
  title: "New Client Team",
  description: "The run gets each team newly created in the chosen client company (reseller keys).",
  action: clientTeamList,
  params: [{
    key: "company_uuid",
    label: "Client company UUID",
    type: "string",
    required: true,
    hint: "UUID of one of your client companies.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Team UUID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { uuid: "3f2b9c1e-0000-4000-8000-000000000001", name: "Support" },
});
