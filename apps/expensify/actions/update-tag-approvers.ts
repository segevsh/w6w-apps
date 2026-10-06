import type { ActionDefinition } from "@w6w/types";
import { objectList, requiredText, runJob } from "../lib/client.ts";

interface Input {
  policyID: string;
  tagApprovers: unknown;
}

/** `update` / `tagApprovers` — the Tag approvers updater. */
const updateTagApprovers: ActionDefinition<Input> = {
  key: "update-tag-approvers",
  type: "perform",
  resource: "policy",
  title: "Update Tag Approvers",
  description:
    "Route expenses carrying a given tag to a specific approver. Single-level tag lists only. Requires policy admin.",
  idempotent: true,
  params: [
    { key: "policyID", label: "Policy ID", type: "string", required: true },
    {
      key: "tagApprovers",
      label: "Tag approvers",
      type: "json",
      required: true,
      hint:
        'JSON array of {"name":"Tag name (must exist)","approver":"member@domain.com"}. An empty approver string clears the tag\'s approver.',
    },
  ],
  output: [{ key: "response", type: "object", label: "The Integration Server's response" }],

  async execute(input, ctx) {
    const tagApprovers = objectList("tagApprovers", input.tagApprovers);
    tagApprovers.forEach((t, i) => {
      requiredText(`tagApprovers[${i}].name`, t.name);
      if (typeof t.approver !== "string") {
        throw new Error(`tagApprovers[${i}].approver must be a string ("" clears it)`);
      }
    });
    const response = await runJob(ctx, {
      type: "update",
      inputSettings: { type: "tagApprovers", policyID: requiredText("policyID", input.policyID) },
      tagApprovers,
    });
    return { response };
  },
};

export default updateTagApprovers;
