import appealList from "../actions/appeal-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-appeal",
  title: "New Appeal",
  description: "The run gets each newly created appeal.",
  action: appealList,
  output: [
    { key: "id", type: "number", label: "Appeal ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 1001, name: "Year-end appeal" },
});
