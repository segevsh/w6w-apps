import { assertEquals, assertRejects } from "@std/assert";
import activityDelete from "../../actions/activity-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("activity-delete: DELETEs /activities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }]);
  const out = await activityDelete.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/activities/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 7 });
});

Deno.test("activity-delete: is marked idempotent", () => {
  assertEquals(activityDelete.idempotent, true);
});

Deno.test("activity-delete: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await activityDelete.execute({ id: 7 }, ctx), Error, "401");
});

Deno.test("activity-delete: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await activityDelete.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
