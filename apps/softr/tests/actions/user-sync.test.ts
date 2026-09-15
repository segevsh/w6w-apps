import { assertEquals } from "@std/assert";
import userSync from "../../actions/user-sync.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-sync: with emails given, POSTs a bare JSON array — not an object", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userSync.execute({ domain: "yourdomain.com", emails: "a@x.com, b@x.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/users/sync");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? "null"), ["a@x.com", "b@x.com"]);
});

/**
 * Sending no body at all means "sync everybody" — sending `[]` or `{}` would
 * be a different, narrower request that the vendor's docs do not describe.
 */
Deno.test("user-sync: with no emails, sends no body at all — sync everybody", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await userSync.execute({ domain: "yourdomain.com" }, ctx);

  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("user-sync: is marked idempotent", () => {
  assertEquals(userSync.idempotent, true);
});
