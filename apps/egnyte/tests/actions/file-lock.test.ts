import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/file-lock.ts";

Deno.test("file-lock: POSTs lock with token and timeout", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  const out = await action.execute({ path: "/a.txt", lockToken: "t", lockTimeout: 7200 }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/a.txt");
  assertEquals(JSON.parse(calls[0].body!), { action: "lock", lock_token: "t", lock_timeout: 7200 });
  assertEquals(out, { lock_token: "t" });
});

Deno.test("file-lock: returns the token Egnyte generated", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { lock_token: "gen" } }, { status: 204 }]);
  assertEquals(await action.execute({ path: "a" }, ctx), { lock_token: "gen" });
  assertEquals(JSON.parse(calls[0].body!), { action: "lock" });
  assertEquals(await action.execute({ path: "a" }, ctx), { lock_token: undefined });
});
