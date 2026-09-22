import { assertEquals } from "@std/assert";
import loggedTimeCreate from "../../actions/logged-time-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-create: POSTs the entry in minutes, against a job item user", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 555, minutes: 90 } }]);
  const result = await loggedTimeCreate.execute({
    minutes: 90,
    date: "2025-08-15",
    jobItemUserId: 90,
    notes: "Reviewed safety procedures",
    private: false,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/logged_times");
  assertEquals(bodyOf(calls[0]), {
    minutes: 90,
    date: "2025-08-15",
    jobItemUserId: 90,
    notes: "Reviewed safety procedures",
    private: false,
  });
  assertEquals(result.id, 555);
});

Deno.test("logged-time-create: minutes is required and integer-validated", () => {
  const param = (loggedTimeCreate.params ?? []).find((p) => p.key === "minutes");
  assertEquals(param?.required, true);
  assertEquals(param?.validation, { integer: true, min: 1 });
  assertEquals(/a full day is not 8/.test(param?.hint ?? ""), true);
});

Deno.test("logged-time-create: the computed totals are read-only", () => {
  const keys = (loggedTimeCreate.params ?? []).map((p) => p.key);
  for (const readonly of ["cost", "totalCostExTax", "totalExTax", "completedDatetime"]) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
