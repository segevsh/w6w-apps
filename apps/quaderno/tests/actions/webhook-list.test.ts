import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

Deno.test("webhook-list: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{
    body: [{ id: 1, url: "https://x.io/hook", events_types: ["invoice.created"] }],
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/webhooks");
  assertEquals(out, [{ id: 1, url: "https://x.io/hook", events_types: ["invoice.created"] }]);
});
