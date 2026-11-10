import { test } from "node:test";
import type { TriggerDefinition } from "@w6w/types";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "../actions/_shared.ts";
import newControl from "../../triggers/new-control.ts";
import newDocument from "../../triggers/new-document.ts";
import newFramework from "../../triggers/new-framework.ts";
import newIntegration from "../../triggers/new-integration.ts";
import newMonitoredComputer from "../../triggers/new-monitored-computer.ts";
import newPerson from "../../triggers/new-person.ts";
import newPolicy from "../../triggers/new-policy.ts";
import newRiskScenario from "../../triggers/new-risk-scenario.ts";
import newTest from "../../triggers/new-test.ts";
import newUser from "../../triggers/new-user.ts";
import newVendor from "../../triggers/new-vendor.ts";
import newTestEntity from "../../triggers/new-test-entity.ts";

// Each collection is read whole through its list action and snapshot-diffed (additions only).
const triggers: Record<string, TriggerDefinition> = {
  "new-control": newControl,
  "new-document": newDocument,
  "new-framework": newFramework,
  "new-integration": newIntegration,
  "new-monitored-computer": newMonitoredComputer,
  "new-person": newPerson,
  "new-policy": newPolicy,
  "new-risk-scenario": newRiskScenario,
  "new-test": newTest,
  "new-user": newUser,
  "new-vendor": newVendor,
  "new-test-entity": newTestEntity,
};

const cases: Array<[string, string, string, Record<string, unknown>]> = [
  ["new-control", "/controls?pageSize=100", "id", {}],
  ["new-document", "/documents?pageSize=100", "id", {}],
  ["new-framework", "/frameworks?pageSize=100", "id", {}],
  ["new-integration", "/integrations?pageSize=100", "integrationId", {}],
  ["new-monitored-computer", "/monitored-computers?pageSize=100", "id", {}],
  ["new-person", "/people?employmentStatus=CURRENT&pageSize=100", "id", {}],
  ["new-policy", "/policies?pageSize=100", "id", {}],
  ["new-risk-scenario", "/risk-scenarios?type=Risk+Scenario&pageSize=100", "riskId", {}],
  ["new-test", "/tests?isInRollout=false&pageSize=100", "id", {}],
  ["new-user", "/users?pageSize=100", "id", {}],
  ["new-vendor", "/vendors?pageSize=100", "id", {}],
  ["new-test-entity", "/tests/test-1/entities?pageSize=100", "id", { testId: "test-1" }],
];

for (const [key, path, idKey, params] of cases) {
  const trigger = triggers[key];
  const item = (id: string) => ({ [idKey]: id, label: `record ${id}` });
  const reply = (ids: string[]) => page(ids.map(item));

  test(`${key}: seeds without events, emits only the new record, retries idempotently`, async () => {
    const seed = mockCtx([reply(["a"])], { display });
    const baseline = await trigger.poll!({ params, state: {} }, seed.ctx);
    assertEquals(baseline.events, []);
    assertEquals(baseline.nextState.seeded, true);
    const response = reply(["b", "a"]);
    const one = await trigger.poll!(
      { params, state: baseline.nextState },
      mockCtx([response], { display }).ctx,
    );
    const retry = await trigger.poll!(
      { params, state: baseline.nextState },
      mockCtx([response], { display }).ctx,
    );
    assertEquals(one.events, [item("b")]);
    assertEquals(one, retry);
  });

  test(`${key}: reads the vendor endpoint ${path}`, async () => {
    const m = mockCtx([reply(["a"])], { display });
    await trigger.poll!({ params, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    assertEquals(m.calls[0].url, `https://api.vanta.com/v1${path}`);
  });
}

test("snapshot triggers: a collection past the 5000-row cap fails loudly instead of reading a prefix", async () => {
  // The action walks 50 pages of 100; every mocked page says another follows, so the walk is cut short.
  const pages = Array.from(
    { length: 50 },
    (_, i) => page([{ id: `v${i}` }], { hasNextPage: true, endCursor: `c${i}` }),
  );
  const m = mockCtx(pages, { display });
  let message = "";
  try {
    await newVendor.poll!({ params: {}, state: {} }, m.ctx);
  } catch (err) {
    message = String(err);
  }
  assertEquals(m.calls.length, 50);
  assert(message.includes("exceed 5000 rows"), message);
});

test("snapshot triggers: read every page (returnAll) and seed without the cap error", async () => {
  const m = mockCtx(
    [
      page([{ id: "v1" }], { hasNextPage: true, endCursor: "c1" }),
      page([{ id: "v2" }], { hasNextPage: false }),
    ],
    { display },
  );
  const out = await newVendor.poll!({ params: {}, state: {} }, m.ctx);
  assertEquals(out.events, []);
  assertEquals(m.calls.length, 2);
  assertEquals(m.calls[0].url, "https://api.vanta.com/v1/vendors?pageSize=100");
  assertEquals(m.calls[1].url, "https://api.vanta.com/v1/vendors?pageSize=100&pageCursor=c1");
});
