import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/file-unlock.ts";

test("file-unlock: POSTs unlock with the token", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  assertEquals(await action.execute({ path: "/a.txt", lockToken: "t" }, ctx), { success: true });
  assertEquals(JSON.parse(calls[0].body!), { action: "unlock", lock_token: "t" });
});
