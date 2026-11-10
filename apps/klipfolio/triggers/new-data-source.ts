import datasourceList from "../actions/datasource-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-data-source",
  title: "New Data Source",
  description: "The run gets each data source newly created in the Klipfolio account.",
  action: datasourceList as never,
  idLabel: "Data source ID",
  sample: { change: "added", key: "d4e5f6", values: { id: "d4e5f6", name: "Stripe revenue" } },
});
