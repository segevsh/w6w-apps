import type { ActionDefinition } from "@w6w/types";
import { NetSuiteClient, REST } from "../lib/client.ts";

/**
 * `GET /services/rest/system/v1/governanceLimits` — "GovernanceLimits Operation": the account's
 * concurrency limit, the part not allocated to any integration, and (when one is allocated) this
 * integration's own limit. Oracle says it "returns results only if you are logged in as an
 * administrator", so a non-admin role gets NetSuite's own permission error.
 */
const governanceLimitsGet: ActionDefinition<Record<string, never>> = {
  key: "governance-limits-get",
  type: "read",
  resource: "system",
  title: "Get Concurrency Limits",
  description: "Read the account's and this integration's REST concurrency limits (admin roles).",
  params: [],
  output: [
    { key: "accountConcurrencyLimit", type: "number", label: "Account concurrency limit" },
    {
      key: "accountUnallocatedConcurrencyLimit",
      type: "number",
      label: "Concurrency not allocated to any integration",
    },
    {
      key: "integrationConcurrencyLimit",
      type: "number",
      label: "This integration's limit (integrationSpecific only)",
    },
    {
      key: "integrationLimitType",
      type: "string",
      label: "integrationSpecific | accountLimit | internal",
    },
  ],

  async execute(_input, ctx) {
    const res = await new NetSuiteClient(ctx).request(`${REST}/system/v1/governanceLimits`);
    const d = res.data ?? {};
    return {
      accountConcurrencyLimit: d.accountConcurrencyLimit ?? null,
      accountUnallocatedConcurrencyLimit: d.accountUnallocatedConcurrencyLimit ?? null,
      integrationConcurrencyLimit: d.integrationConcurrencyLimit ?? null,
      integrationLimitType: d.integrationLimitType ?? null,
    };
  },
};

export default governanceLimitsGet;
