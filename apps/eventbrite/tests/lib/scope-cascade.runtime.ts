/** Runtime witness: `resolveParams` over the real list-* params (effective required + alias). */
import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import { resolveParams } from "@w6w/runtime";
import listEvents from "../../actions/list-events.ts";
import listAttendees from "../../actions/list-attendees.ts";
import listOrders from "../../actions/list-orders.ts";

const run = (a: { params?: import("@w6w/types").Param[] }, v: Record<string, unknown>) =>
  resolveParams(a.params ?? [], v);

function invalidNaming(fn: () => unknown, key: string) {
  const e = assertThrows(fn) as { code?: string; message: string };
  assertEquals(e.code, "param_invalid");
  assert(e.message.includes(`"${key}"`), e.message);
}

test("list-events: venue / series scope require scopeId", () => {
  invalidNaming(() => run(listEvents, { scope: "venue" }), "scopeId");
  invalidNaming(() => run(listEvents, { scope: "series" }), "scopeId");
  assertEquals(run(listEvents, { scope: "venue", scopeId: "v1" }).scopeId, "v1");
  assertEquals(run(listEvents, { scope: "series", scopeId: "s1" }).scopeId, "s1");
});

test("list-events: organization scope with only legacy organizationId resolves and survives", () => {
  const out = run(listEvents, { scope: "organization", organizationId: "o1" });
  assertEquals(out.organizationId, "o1");
});

test("list-attendees / list-orders: scopeId stays required", () => {
  invalidNaming(() => run(listAttendees, { scope: "organization" }), "scopeId");
  invalidNaming(() => run(listOrders, { scope: "user" }), "scopeId");
  assertEquals(run(listOrders, { scope: "user", scopeId: "u1" }).scopeId, "u1");
});
