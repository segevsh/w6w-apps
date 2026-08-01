import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe-delete.ts";

Deno.test("unsubscribe-delete: DELETEs /v3/{domain}/unsubscribes/{address}", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "Removed" } }]);
  await action.execute!({ domain: "mg.example.com", address: "a@b.com" }, ctx);
  assertEquals(calls[0].url, "https://api.mailgun.net/v3/mg.example.com/unsubscribes/a%40b.com");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("unsubscribe-delete: requires domain and address", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ domain: "", address: "a@b.com" }, ctx),
    Error,
    "`domain`",
  );
});
