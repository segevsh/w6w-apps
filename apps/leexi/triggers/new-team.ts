import teamList from "../actions/team-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-team",
  title: "New Team",
  description: "The run gets each team newly created in the Leexi workspace.",
  action: teamList,
  output: [
    { key: "uuid", type: "string", label: "Team UUID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { uuid: "3f2b9c1e-0000-4000-8000-000000000001", name: "Sales EMEA" },
});
