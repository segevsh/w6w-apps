import { assertEquals } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-create: POSTs customer_id and address_id, both required", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "j1" } }]);
  await jobCreate.execute({ customerId: "c1", addressId: "a1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/jobs");
  assertEquals(bodyOf(calls[0]), { customer_id: "c1", address_id: "a1" });

  for (const key of ["customerId", "addressId"]) {
    assertEquals(jobCreate.params?.find((p) => p.key === key)?.required, true, key);
  }
});

Deno.test("job-create: job_fields is nested, and omitted when neither id is set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await jobCreate.execute({ customerId: "c1", addressId: "a1", jobTypeId: "jt1" }, ctx);
  await jobCreate.execute({ customerId: "c1", addressId: "a1" }, ctx);

  assertEquals(bodyOf(calls[0]).job_fields, { job_type_id: "jt1" });
  assertEquals("job_fields" in bodyOf(calls[1]), false);
});

Deno.test("job-create: schedule and line items pass through as parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobCreate.execute({
    customerId: "c1",
    addressId: "a1",
    schedule: '{"scheduled_start":"2026-03-23T15:30:00","arrival_window":60}',
    lineItems: '[{"name":"Diagnostic","unit_price":9900,"quantity":1}]',
    assignedEmployeeIds: "e1, e2",
  }, ctx);

  const body = bodyOf(calls[0]);
  assertEquals(body.schedule, { scheduled_start: "2026-03-23T15:30:00", arrival_window: 60 });
  assertEquals(body.line_items, [{ name: "Diagnostic", unit_price: 9900, quantity: 1 }]);
  assertEquals(body.assigned_employee_ids, ["e1", "e2"]);
});

Deno.test("job-create: is not idempotent — the API accepts no idempotency key", () => {
  assertEquals(jobCreate.idempotent, false);
});
