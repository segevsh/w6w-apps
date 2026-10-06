import { assertEquals, assertRejects } from "@std/assert";
import appointmentDelete from "../../actions/appointment-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("appointment-delete: DELETEs /appointments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }]);
  const out = await appointmentDelete.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/appointments/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 7 });
});

Deno.test("appointment-delete: is marked idempotent", () => {
  assertEquals(appointmentDelete.idempotent, true);
});

Deno.test("appointment-delete: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await appointmentDelete.execute({ id: 7 }, ctx), Error, "401");
});

Deno.test("appointment-delete: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await appointmentDelete.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
