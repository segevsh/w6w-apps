import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/contact-course-grant.ts";
import { actionBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-course-grant: is a non-idempotent perform action on the contact id", () => {
  assertEquals(action.key, "contact-course-grant");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(action.params![0].key, "id");
  assertEquals(action.params![0].required, true);
});

Deno.test("contact-course-grant: POSTs /customers/11/actions/course_grant with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: actionBody(true, "done") }]);
  const out = await action.execute({ id: 11, courseId: 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/customers/11/actions/course_grant");
  assertEquals(JSON.parse(calls[0].body!), { "course_id": 2 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, { success: true, message: "done" });
});

Deno.test("contact-course-grant: HTTP 200 with success:false is a failure, not a result", async () => {
  const { ctx } = mockCtx([{ body: actionBody(false, "Contact not found") }]);
  await assertRejects(
    async () => await action.execute({ id: 11, courseId: 2 }, ctx),
    Error,
    "Contact not found",
  );
});

Deno.test("contact-course-grant: a 422 surfaces the errors array", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { errors: ["bad one", "bad two"] } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, courseId: 2 }, ctx),
    Error,
    "bad one; bad two",
  );
});

Deno.test("contact-course-grant: a 200 without a success flag is an error", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  await assertRejects(
    async () => await action.execute({ id: 11, courseId: 2 }, ctx),
    Error,
    "data.success",
  );
});
