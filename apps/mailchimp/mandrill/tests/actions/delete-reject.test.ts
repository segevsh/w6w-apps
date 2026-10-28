import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-reject.ts";

Deno.test("delete-reject: POSTs /rejects/delete.json with the email", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { email: "a@x.com", deleted: true } }]);
  await action.execute!({ email: "a@x.com" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/rejects/delete.json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@x.com" });
});
