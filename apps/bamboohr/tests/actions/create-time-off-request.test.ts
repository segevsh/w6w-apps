import { assert, assertEquals } from "@std/assert";
import createTimeOffRequest from "../../actions/create-time-off-request.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";

const BASE = {
  employeeId: "42",
  status: "requested",
  start: "2026-09-01",
  end: "2026-09-05",
  timeOffTypeId: "1",
};

Deno.test("create-time-off-request: PUTs to /employees/{id}/time_off/request", async () => {
  assertEquals(createTimeOffRequest.type, "perform");
  const { ctx, calls } = mockCtx([{ status: 201, body: "" }]);
  const out = await createTimeOffRequest.execute({ ...BASE }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/42/time_off/request");
  // PUT, not POST — and the path hangs off the employee, not off /time_off.
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    status: "requested",
    start: "2026-09-01",
    end: "2026-09-05",
    timeOffTypeId: "1",
  });
  assertEquals(out, { status: 201 });
});

Deno.test("create-time-off-request: is non-idempotent — a retry books more leave", () => {
  assertEquals(createTimeOffRequest.idempotent, false);
});

Deno.test("create-time-off-request: the four schema-required fields are required", () => {
  // Schema: required = ["status", "start", "end", "timeOffTypeId"], plus the
  // employeeId that forms the path.
  const required = (createTimeOffRequest.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), ["employeeId", "end", "start", "status", "timeOffTypeId"]);
});

Deno.test("create-time-off-request: status options match the create schema exactly", () => {
  // `canceled` is NOT valid on create — only on the status update endpoint.
  assertEquals(
    optionValues(createTimeOffRequest, "status"),
    ["requested", "approved", "denied", "declined"],
  );
  assertEquals(param(createTimeOffRequest, "status").default, "requested");
});

Deno.test("create-time-off-request: warns that approved/denied need permission and 403", () => {
  const hint = param(createTimeOffRequest, "status").hint ?? "";
  assert(/403/.test(hint), "a 403 here looks like a broken credential unless explained");
  assert(/suppress/i.test(hint), "must say approval notifications are suppressed");
});

Deno.test("create-time-off-request: labels previousRequest as destructive", () => {
  // It sets the prior request to `superceded`, removes all approvals, marks the
  // workflow deleted and deletes its notifications. That is not a link.
  const hint = param(createTimeOffRequest, "previousRequest").hint ?? "";
  assert(/DESTRUCTIVE/i.test(hint));
  assert(/superceded/i.test(hint));
});

Deno.test("create-time-off-request: optional bodies pass through, unset ones are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: "" }]);
  await createTimeOffRequest.execute({
    ...BASE,
    amount: 8,
    notes: [{ from: "employee", note: "Trip" }],
    dates: [{ ymd: "2026-09-01", amount: 8 }],
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.amount, 8);
  assertEquals(body.dates, [{ ymd: "2026-09-01", amount: 8 }]);
  assertEquals(body.notes, [{ from: "employee", note: "Trip" }]);
  assertEquals("previousRequest" in body, false);
});

Deno.test("create-time-off-request: says amount is ignored when dates is given", () => {
  assert(/ignored/i.test(param(createTimeOffRequest, "amount").hint ?? ""));
});

Deno.test("create-time-off-request: the employee id is escaped into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: "" }]);
  await createTimeOffRequest.execute({ ...BASE, employeeId: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/a%2Fb/time_off/request");
});
