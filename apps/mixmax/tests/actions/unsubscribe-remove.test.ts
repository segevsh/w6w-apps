import { assertEquals } from "@std/assert";
import action from "../../actions/unsubscribe-remove.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("unsubscribe-remove: DELETE /unsubscribes", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ email: "a@x.com" } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/unsubscribes");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@x.com" });
  assertEquals(out, { removed: true });
});
