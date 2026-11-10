import dashboardList from "../actions/dashboard-list.ts";
import { newRecordTrigger } from "../lib/triggers.ts";

export default newRecordTrigger({
  key: "new-dashboard",
  title: "New Dashboard",
  description: "The run gets each dashboard newly created in the Klipfolio account.",
  action: dashboardList as never,
  idLabel: "Dashboard ID",
  sample: { change: "added", key: "a1b2c3", values: { id: "a1b2c3", name: "Sales overview" } },
});
