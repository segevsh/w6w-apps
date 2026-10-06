import { assertEquals } from "@std/assert";
import action from "../../actions/unsubscribe-add.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("unsubscribe-add: POST /unsubscribes", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ name: "A", email: "a@x.com" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/unsubscribes");
  assertEquals(JSON.parse(calls[0].body!), { name: "A", email: "a@x.com" });
  assertEquals(out, { added: true });
});
