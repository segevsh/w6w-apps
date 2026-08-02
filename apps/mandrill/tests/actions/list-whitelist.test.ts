import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-whitelist.ts";

Deno.test("list-whitelist: POSTs /whitelists/list.json with an optional email filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ email: "a@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/whitelists/list.json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@x.com" });
});
