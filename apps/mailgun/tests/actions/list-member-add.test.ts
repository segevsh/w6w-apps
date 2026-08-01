import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-member-add.ts";

Deno.test("list-member-add: POSTs form-encoded fields to /v3/lists/{list}/members", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { member: { address: "a@b.com" } } }]);
  const result = await action.execute!(
    {
      listAddress: "list@mg.example.com",
      address: "a@b.com",
      name: "Alice",
      vars: { plan: "pro" },
      subscribed: true,
      upsert: true,
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.mailgun.net/v3/lists/list%40mg.example.com/members");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("address"), "a@b.com");
  assertEquals(body.get("name"), "Alice");
  assertEquals(body.get("vars"), JSON.stringify({ plan: "pro" }));
  assertEquals(body.get("subscribed"), "yes");
  assertEquals(body.get("upsert"), "yes");
  assertEquals(result, { member: { address: "a@b.com" } });
});

Deno.test("list-member-add: defaults upsert to no when not set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ listAddress: "list@mg.example.com", address: "a@b.com" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("upsert"), "no");
  assertEquals(body.has("vars"), false);
});

Deno.test("list-member-add: requires listAddress and address", async () => {
  const { ctx: c1 } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listAddress: "", address: "a@b.com" }, c1),
    Error,
    "`listAddress`",
  );
  const { ctx: c2 } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listAddress: "list@mg.example.com", address: "" }, c2),
    Error,
    "`address`",
  );
});
