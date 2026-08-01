import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bounce-delete.ts";

Deno.test("bounce-delete: DELETEs /v3/{domain}/bounces/{address}", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "Removed" } }]);
  await action.execute!({ domain: "mg.example.com", address: "a@b.com" }, ctx);
  assertEquals(calls[0].url, "https://api.mailgun.net/v3/mg.example.com/bounces/a%40b.com");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("bounce-delete: requires domain and address", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ domain: "mg.example.com", address: "" }, ctx),
    Error,
    "`address`",
  );
});
