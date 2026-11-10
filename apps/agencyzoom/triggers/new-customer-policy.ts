import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import customerPolicyList from "../actions/customer-policy-list.ts";

export default snapshotTrigger<{ customerId: number }>({
  key: "new-customer-policy",
  title: "New Customer Policy",
  description: "The run gets each new policy written for a customer.",
  action: customerPolicyList as unknown as ActionDefinition,
  input: (p) => ({ customerId: Number(p.customerId) }),
  pick: (result) => arrayAt(result, "policies"),
  idOf: idField("id"),
  params: [{
    key: "customerId",
    label: "Customer ID",
    type: "number",
    required: true,
    hint: "From Search Customers.",
  }],
  output: [
    { key: "id", type: "number", label: "Policy ID" },
    { key: "policyNumber", type: "string", label: "Policy number" },
    { key: "premium", type: "number", label: "Premium (cents)" },
    { key: "status", type: "number", label: "Status" },
  ],
  sample: { id: 7001, policyNumber: "POL-1001", premium: 120000, status: 1 },
});
