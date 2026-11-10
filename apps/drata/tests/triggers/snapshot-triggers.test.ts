import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import asset from "../../triggers/new-asset.ts";
import control from "../../triggers/new-control.ts";
import device from "../../triggers/new-device.ts";
import evidence from "../../triggers/new-evidence.ts";
import monitoringTest from "../../triggers/new-monitoring-test.ts";
import monitoringTestFailure from "../../triggers/new-monitoring-test-failure.ts";
import personnel from "../../triggers/new-personnel.ts";
import policy from "../../triggers/new-policy.ts";
import risk from "../../triggers/new-risk.ts";
import riskRegister from "../../triggers/new-risk-register.ts";
import user from "../../triggers/new-user.ts";
import vendor from "../../triggers/new-vendor.ts";
import workspace from "../../triggers/new-workspace.ts";

const cases = [
  [asset, {}, "/public/v2/assets"],
  [control, { workspaceId: 7 }, "/public/v2/workspaces/7/controls"],
  [device, {}, "/public/v2/devices"],
  [evidence, { workspaceId: 7 }, "/public/v2/workspaces/7/evidence"],
  [monitoringTest, { workspaceId: 7 }, "/public/v2/workspaces/7/monitoring-tests"],
  [
    monitoringTestFailure,
    { workspaceId: 7, testId: 9 },
    "/public/v2/workspaces/7/monitoring-tests/9/failures",
  ],
  [personnel, {}, "/public/v2/personnel"],
  [policy, {}, "/public/v2/policies"],
  [risk, { riskRegisterId: 8 }, "/public/v2/risk-registers/8/risks"],
  [riskRegister, {}, "/public/v2/risk-registers"],
  [user, {}, "/public/v2/users"],
  [vendor, {}, "/public/v2/vendors"],
  [workspace, {}, "/public/v2/workspaces"],
] as const;

for (const [trigger, params, path] of cases) {
  test(`${trigger.key}: baselines then emits a snapshot addition with its literal list request`, async () => {
    const first = mockCtx([{ body: page([{ id: 1, name: "Before" }]) }]);
    const seeded = await trigger.poll!({ params, state: {}, subscriptionId: "sub-1" }, first.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(first.calls[0].method, "GET");
    assertEquals(
      new URL(first.calls[0].url).origin + new URL(first.calls[0].url).pathname,
      "https://public-api.drata.com" + path,
    );
    assertEquals(Object.fromEntries(new URL(first.calls[0].url).searchParams), { size: "500" });

    const second = mockCtx([{ body: page([{ id: 1, name: "Before" }, { id: 2, name: "After" }]) }]);
    const changed = await trigger.poll!({
      params,
      state: seeded.nextState,
      subscriptionId: "sub-1",
    }, second.ctx);
    assertEquals(changed.events, [{ change: "added", key: "2", values: { id: 2, name: "After" } }]);

    const retry = await trigger.poll!(
      { params, state: seeded.nextState, subscriptionId: "sub-1" },
      mockCtx([{ body: page([{ id: 1, name: "Before" }, { id: 2, name: "After" }]) }]).ctx,
    );
    assertEquals(retry, changed);
  });
}
