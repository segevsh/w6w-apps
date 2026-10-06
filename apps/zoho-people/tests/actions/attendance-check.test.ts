import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/attendance-check.ts";

Deno.test("attendance-check: POSTs times, default date format and employee key", async () => {
  const { ctx, calls } = mockPeopleCtx([{ body: { response: { result: "ok", status: 0 } } }]);
  await action.execute({
    checkIn: "09/09/2026 09:30:45",
    empId: "0941",
    location: "Delhi",
    latitude: 28.6,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/people/api/attendance");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("dateFormat"), "dd/MM/yyyy HH:mm:ss");
  assertEquals(form.get("checkIn"), "09/09/2026 09:30:45");
  assertEquals(form.has("checkOut"), false);
  assertEquals(form.get("empId"), "0941");
  assertEquals(form.get("location"), "Delhi");
  assertEquals(form.get("latitude"), "28.6");
});

Deno.test("attendance-check: a plain-text vendor answer is returned, not a parse error", async () => {
  const { ctx } = mockPeopleCtx([{ body: "Success", headers: { "content-type": "text/plain" } }]);
  const out = await action.execute(
    { checkOut: "09/09/2026 18:00:00", emailId: "a@b.com" },
    ctx,
  ) as { result: unknown };
  assertEquals(out.result, "Success");
});

Deno.test("attendance-check: needs an employee key and a time, before any request", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(
    () => action.execute({ checkIn: "x" }, ctx) as Promise<unknown>,
    Error,
    "empId",
  );
  await assertRejects(
    () => action.execute({ empId: "1" }, ctx) as Promise<unknown>,
    Error,
    "checkIn",
  );
  assertEquals(calls.length, 0);
});

Deno.test("attendance-check: not idempotent", () => assertEquals(action.idempotent, false));
