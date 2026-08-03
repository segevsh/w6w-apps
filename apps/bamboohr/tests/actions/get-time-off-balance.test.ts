import { assert, assertEquals } from "@std/assert";
import getTimeOffBalance from "../../actions/get-time-off-balance.ts";
import { description, mockCtx, param } from "../_helpers.ts";

Deno.test("get-time-off-balance: reads /employees/{id}/time_off/calculator", async () => {
  assertEquals(getTimeOffBalance.type, "read");
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getTimeOffBalance.execute({ employeeId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/42/time_off/calculator");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-time-off-balance: `end` is an as-of date, and can be in the future", async () => {
  // Not a filter — "the date to calculate the time off balance as of ... use a
  // future date to project balance".
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getTimeOffBalance.execute({ employeeId: "1", end: "2026-12-31" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("end"), "2026-12-31");

  assert(/as of/i.test(param(getTimeOffBalance, "end").hint ?? ""));
  assert(/project/i.test(description(getTimeOffBalance)));
});

Deno.test("get-time-off-balance: precision is passed through and bounded 0-4", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getTimeOffBalance.execute({ employeeId: "1", precision: 4 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("precision"), "4");

  assertEquals(param(getTimeOffBalance, "precision").validation, { min: 0, max: 4, integer: true });
});

Deno.test("get-time-off-balance: precision 0 is a real value and must survive", async () => {
  // A falsy-but-meaningful number. `0` decimal places is a legitimate request.
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getTimeOffBalance.execute({ employeeId: "1", precision: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("precision"), "0");
});

Deno.test("get-time-off-balance: only the employee id is required, and it is escaped", async () => {
  const required = (getTimeOffBalance.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["employeeId"]);
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getTimeOffBalance.execute({ employeeId: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/a%2Fb/time_off/calculator");
});
