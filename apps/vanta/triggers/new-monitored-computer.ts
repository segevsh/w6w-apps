import monitoredComputerList from "../actions/monitored-computer-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/monitored-computers` through `monitored-computer-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-monitored-computer",
  title: "New Monitored Computer",
  description: "The run gets each computer newly reporting to Vanta.",
  action: monitoredComputerList,
  listKey: "computers",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Computer ID" },
    { key: "integrationId", type: "string", label: "Integration ID" },
    { key: "serialNumber", type: "string", label: "Serial number" },
  ],
  sample: { id: "computer-1", integrationId: "jamf", serialNumber: "SERIAL-1" },
});
