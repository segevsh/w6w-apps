import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import newAsset from "../../triggers/new-asset.ts";
import newControl from "../../triggers/new-control.ts";
import newDevice from "../../triggers/new-device.ts";
import newEvidence from "../../triggers/new-evidence.ts";
import newMonitoringTest from "../../triggers/new-monitoring-test.ts";
import newPersonnel from "../../triggers/new-personnel.ts";
import newPolicy from "../../triggers/new-policy.ts";
import newRisk from "../../triggers/new-risk.ts";
import newRiskRegister from "../../triggers/new-risk-register.ts";
import newUser from "../../triggers/new-user.ts";
import newVendor from "../../triggers/new-vendor.ts";
import newWorkspace from "../../triggers/new-workspace.ts";

const ROOT = "https://public-api.drata.com/public/v2";
const Q = "size=100&sort=createdAt&sortDir=DESC";

const cases = [
  { key: "new-asset", trigger: newAsset, params: {}, url: `${ROOT}/assets?${Q}` },
  {
    key: "new-control",
    trigger: newControl,
    params: { workspaceId: 7 },
    url: `${ROOT}/workspaces/7/controls?${Q}`,
  },
  { key: "new-device", trigger: newDevice, params: {}, url: `${ROOT}/devices?${Q}` },
  {
    key: "new-evidence",
    trigger: newEvidence,
    params: { workspaceId: 7 },
    url: `${ROOT}/workspaces/7/evidence?${Q}`,
  },
  {
    key: "new-monitoring-test",
    trigger: newMonitoringTest,
    params: { workspaceId: 7 },
    url: `${ROOT}/workspaces/7/monitoring-tests?${Q}`,
  },
  { key: "new-personnel", trigger: newPersonnel, params: {}, url: `${ROOT}/personnel?${Q}` },
  { key: "new-policy", trigger: newPolicy, params: {}, url: `${ROOT}/policies?${Q}` },
  {
    key: "new-risk",
    trigger: newRisk,
    params: { riskRegisterId: 3 },
    url: `${ROOT}/risk-registers/3/risks?${Q}`,
  },
  {
    key: "new-risk-register",
    trigger: newRiskRegister,
    params: {},
    url: `${ROOT}/risk-registers?${Q}`,
  },
  { key: "new-user", trigger: newUser, params: {}, url: `${ROOT}/users?${Q}` },
  { key: "new-vendor", trigger: newVendor, params: {}, url: `${ROOT}/vendors?${Q}` },
  { key: "new-workspace", trigger: newWorkspace, params: {}, url: `${ROOT}/workspaces?${Q}` },
];

for (const entry of cases) {
  test(`${entry.key} seeds, emits, retries, and makes its literal newest-first request`, async () => {
    const input = { params: entry.params, state: {}, subscriptionId: "sub" };
    const seed = mockCtx([{ body: page([{ id: 1 }]) }]);
    const seeded = await entry.trigger.poll!(input, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, entry.url);

    const next = page([{ id: 2 }, { id: 1 }]);
    const first = await entry.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: next }]).ctx,
    );
    const retry = await entry.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: next }]).ctx,
    );
    assertEquals(first.events, [{ id: 2 }]);
    assertEquals(retry, first);
  });
}

test("parent-scoped Drata triggers expose only their required parent id", () => {
  const keys = (t: { params?: Array<{ key: string; required?: boolean }> }) =>
    (t.params ?? []).map((p) => [p.key, p.required]);
  assertEquals(keys(newControl), [["workspaceId", true]]);
  assertEquals(keys(newEvidence), [["workspaceId", true]]);
  assertEquals(keys(newMonitoringTest), [["workspaceId", true]]);
  assertEquals(keys(newRisk), [["riskRegisterId", true]]);
  assertEquals(keys(newAsset), []);
});
