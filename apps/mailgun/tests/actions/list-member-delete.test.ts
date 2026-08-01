import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-member-delete.ts";

Deno.test("list-member-delete: DELETEs /v3/lists/{list}/members/{address}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { member: { address: "a@b.com" } } }]);
  await action.execute!({ listAddress: "list@mg.example.com", address: "a@b.com" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.mailgun.net/v3/lists/list%40mg.example.com/members/a%40b.com",
  );
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("list-member-delete: requires listAddress and address", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ listAddress: "", address: "" }, ctx),
    Error,
    "`listAddress`",
  );
});
