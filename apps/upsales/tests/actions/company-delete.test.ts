import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import companyDelete from "../../actions/company-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("company-delete: DELETEs /accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: null } }]);
  const out = await companyDelete.execute({ id: 7 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/accounts/7`);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true, id: 7 });
});

test("company-delete: is marked idempotent", () => {
  assertEquals(companyDelete.idempotent, true);
});

test("company-delete: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(async () => await companyDelete.execute({ id: 7 }, ctx), Error, "401");
});

test("company-delete: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () => await companyDelete.execute({ id: 7 }, ctx),
    Error,
    "ThrottleLimit",
  );
});
