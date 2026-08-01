import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-bin.ts";

Deno.test("create-bin: POSTs /api/bin and derives the request URL from the returned binId", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { binId: "YS4il4gS", now: 1439113980530, expires: 1439115780530 } },
  ]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.postb.in/api/bin");
  assertEquals(out.binId, "YS4il4gS");
  assertEquals(out.now, 1439113980530);
  assertEquals(out.expires, 1439115780530);
  assertEquals(out.requestUrl, "https://www.postb.in/YS4il4gS");
});
