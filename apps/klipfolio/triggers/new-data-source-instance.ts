import datasourceInstanceList from "../actions/datasource-instance-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-data-source-instance",
  title: "New Data Source Instance",
  description: "The run gets each data source instance newly created in the Klipfolio account.",
  action: datasourceInstanceList as never,
  idLabel: "Instance ID",
  sample: { change: "added", key: "i1a2b3", values: { id: "i1a2b3", name: "Sales sheet" } },
});
