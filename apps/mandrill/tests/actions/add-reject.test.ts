import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-reject.ts";

Deno.test("add-reject: POSTs /rejects/add.json with email and optional comment/subaccount", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { email: "a@x.com", added: true } }]);
  const out = await action.execute!(
    { email: "a@x.com", comment: "spam", subaccount: "sub1" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/rejects/add.json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { email: "a@x.com", comment: "spam", subaccount: "sub1" },
  );
  assertEquals(out, { email: "a@x.com", added: true });
});
