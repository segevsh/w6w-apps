import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-instagram-accounts.ts";

Deno.test("list-instagram-accounts: GET /me/accounts with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ limit: 5, cursor: "c" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/me/accounts");
  assertEquals(Object.fromEntries(url.searchParams), {
    fields: "id,name,instagram_business_account{id,username,name,profile_picture_url}",
    limit: "5",
    after: "c",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("list-instagram-accounts: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ limit: 5, cursor: "c" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
