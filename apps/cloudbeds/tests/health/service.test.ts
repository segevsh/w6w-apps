import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import service, {
  componentKey,
  mapComponentStatus,
  PMS_COMPONENT_ID,
  PMS_COMPONENT_NAME,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

test("service: mapComponentStatus maps the two observed-live values correctly", () => {
  assertEquals(mapComponentStatus("OPERATIONAL"), "ok");
  assertEquals(mapComponentStatus("DEGRADEDPERFORMANCE"), "degraded");
});

test("service: mapComponentStatus maps the unobserved-but-inferred values, and falls back to unknown", () => {
  assertEquals(mapComponentStatus("PARTIALOUTAGE"), "degraded");
  assertEquals(mapComponentStatus("UNDERMAINTENANCE"), "degraded");
  assertEquals(mapComponentStatus("MAJOROUTAGE"), "down");
  // An unrecognised status string must never silently read as healthy.
  assertEquals(mapComponentStatus("SOME_FUTURE_STATE"), "unknown");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

test("service: componentKey prefers the vendor id, falls back to a name slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "Property Management System" }, 0), "abc123");
  assertEquals(componentKey({ name: "Booking Engine" }, 3), "booking-engine-3");
  assertEquals(componentKey({}, 5), "component-5");
});

test("service: check() derives the verdict from the PMS component alone, not the page", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        components: [
          { id: PMS_COMPONENT_ID, name: PMS_COMPONENT_NAME, status: "OPERATIONAL" },
          { id: "other", name: "Digital Marketing Suite", status: "DEGRADEDPERFORMANCE" },
        ],
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  // The PMS component is operational; the unrelated marketing incident must
  // not drag the verdict down.
  assertEquals(result.state, "ok");
  assert(result.message?.includes("unrelated to this app"), result.message);
  assert(Object.keys(result.components ?? {}).length === 2);
});

test("service: check() reports degraded when the PMS component itself is degraded", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        components: [{
          id: PMS_COMPONENT_ID,
          name: PMS_COMPONENT_NAME,
          status: "DEGRADEDPERFORMANCE",
        }],
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
});

test("service: check() returns unknown, never down, when the status page itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

test("service: check() returns unknown when the PMS component disappears from the page", async () => {
  const { ctx } = mockCtx([{
    body: { components: [{ id: "other", name: "Booking Engine", status: "OPERATIONAL" }] },
  }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(result.message?.includes("no longer lists"), result.message);
});

test("service: check() returns unknown on an unreadable body", async () => {
  const { ctx } = mockCtx([{ body: "not an object with a components array" }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

test("service: declaration matches the pack conventions — unsigned, app-scoped, own allowlist", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.cloudbeds.com"]);
});
