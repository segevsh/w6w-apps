import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-delete.ts";

const display = { projectId: "proj_1" };

/**
 * Deleting the key this connection uses breaks it and every workflow on it,
 * and nothing in the API says which id that is.
 */
Deno.test("key-delete: refuses without the confirmation, and says why", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ apiKeyId: "k1" }, ctx),
    Error,
    "breaks every workflow on it",
  );
  assertEquals(calls.length, 0);
});

Deno.test("key-delete: confirmed, it revokes and warns", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }], { display });
  assertEquals(await action.execute!({ apiKeyId: "k1", confirm: true }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/keys/k1");
  assertEquals(calls[0].method, "DELETE");
  assert(logs.some((l) => l.level === "warn"), JSON.stringify(logs));
});

Deno.test("key-delete: needs an id even with the confirmation set", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "apiKeyId",
  );
  assertEquals(calls.length, 0);
});
