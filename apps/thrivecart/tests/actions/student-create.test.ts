import { assertEquals } from "@std/assert";
import studentCreate from "../../actions/student-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("student-create: calls POST /students with nested order_info[] keys", async () => {
  const { ctx, calls } = mockCtx([
    { body: { auto_signin_url: "https://x/signin", student: { id: "1" } } },
  ]);
  await studentCreate.execute(
    {
      email: "student@example.com",
      courseId: "9",
      tags: ["vip", "beta"],
      orderId: "851411",
      purchaseType: "product",
      purchaseId: "373",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/external/students");
  const form = formOf(calls[0]);
  assertEquals(form.email, "student@example.com");
  assertEquals(form.course_id, "9");
  assertEquals(form.tags, ["vip", "beta"]);
  assertEquals(form["order_info[order_id]"], "851411");
  assertEquals(form["order_info[purchase_type]"], "product");
  assertEquals(form["order_info[purchase_id]"], "373");
  assertEquals(form.trigger_emails, "true");
});

Deno.test("student-create: order_info fields are omitted when no order is linked", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await studentCreate.execute({ email: "a@b.com", courseId: "9" }, ctx);
  const form = formOf(calls[0]);
  assertEquals("order_info[order_id]" in form, false);
});

Deno.test("student-create: is not idempotent", () => {
  assertEquals(studentCreate.idempotent, false);
});
