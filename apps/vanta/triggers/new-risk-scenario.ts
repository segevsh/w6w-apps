import riskScenarioList from "../actions/risk-scenario-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/risk-scenarios` through `risk-scenario-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-risk-scenario",
  title: "New Risk Scenario",
  description: "The run gets each risk scenario newly added to the Vanta risk register.",
  action: riskScenarioList,
  listKey: "scenarios",
  idKey: "riskId",
  output: [
    { key: "riskId", type: "string", label: "Risk ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "owner", type: "string", label: "Owner email" },
  ],
  sample: {
    riskId: "RISK-1",
    description: "Customer data exposed by a misconfigured bucket",
    owner: "alex@example.com",
  },
});
