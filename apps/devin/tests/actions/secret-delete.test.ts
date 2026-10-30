import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import secretDelete from "../../actions/secret-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("secret-delete: DELETEs /secrets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { secret_id: "secret-1", key: "GH_TOKEN" } }]);
  const out = await secretDelete.execute({ secretId: "secret-1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${API_ROOT}/secrets/secret-1`);
  assertEquals(out.secret_id, "secret-1");
});

test("secret-delete: is marked idempotent — retrying lands on the same deleted state", () => {
  assertEquals(secretDelete.idempotent, true);
});
