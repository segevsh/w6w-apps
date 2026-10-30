import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import campaignDelete from "../../actions/campaign-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("campaign-delete: DELETEs /projects/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }]);
  const out = await campaignDelete.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/projects/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 7 });
});

test("campaign-delete: is marked idempotent", () => {
  assertEquals(campaignDelete.idempotent, true);
});

test("campaign-delete: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await campaignDelete.execute({ id: 7 }, ctx), Error, "401");
});

test("campaign-delete: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await campaignDelete.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
