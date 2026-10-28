import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-senders.ts";

Deno.test("list-senders: POSTs /users/senders.json with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ address: "ada@x.com" }] }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/users/senders.json");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, [{ address: "ada@x.com" }]);
});
