import fundList from "../actions/fund-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-fund",
  title: "New Fund",
  description: "The run gets each newly created fund.",
  action: fundList,
  output: [
    { key: "id", type: "number", label: "Fund ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 1001, name: "General operating" },
});
