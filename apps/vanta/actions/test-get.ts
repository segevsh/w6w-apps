import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";

/**
 * `GET /v1/tests/{testId}` — one test in full.
 *
 * The fields worth reading are the ones that turn a red status into an action:
 * which **controls** the test satisfies (so a failure can be described in the
 * language of the framework rather than the tooling), which **integration**
 * feeds it (so "is this broken or is the integration broken" has an answer),
 * and its remediation guidance.
 *
 * The resources actually causing the failure are a separate call —
 * `test-entity-list` — because a test that fails on four hundred laptops has
 * four hundred of them.
 */
const action: ActionDefinition = {
  key: "test-get",
  type: "read",
  resource: "test",
  title: "Get a test",
  description:
    "One test with the controls it satisfies and the integration that feeds it — which is what " +
    "distinguishes 'this is broken' from 'the integration is broken'.",
  params: [
    { key: "testId", label: "Test ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Test ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "controls", type: "array", label: "Controls this test satisfies" },
    { key: "integrations", type: "array", label: "What feeds it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const testId = String(p.testId ?? "").trim();
    if (!testId) throw new Error("`testId` is required");
    return await new VantaClient(ctx).request(`/tests/${encodeURIComponent(testId)}`);
  },
};

export default action;
