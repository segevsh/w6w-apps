import { snapshotTrigger } from "../lib/triggers.ts";
import callroutersList from "../actions/callrouters-list.ts";

export default snapshotTrigger({
  key: "new-call-router",
  title: "New Call Router",
  description: "The run gets each API-based call router newly created in the company.",
  action: callroutersList,
  output: [
    { key: "id", type: "string", label: "Call router ID" },
    { key: "name", type: "string", label: "Call router name" },
    { key: "office_id", type: "string", label: "Office ID" },
    { key: "routing_url", type: "string", label: "Routing URL" },
  ],
  sample: {
    id: "9001",
    name: "Support router",
    office_id: "5001",
    routing_url: "https://example.com/route",
  },
});
