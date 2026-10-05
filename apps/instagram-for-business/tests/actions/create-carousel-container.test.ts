import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-carousel-container.ts";

Deno.test("create-carousel-container: POST /17/media with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ igUserId: "17", children: "a, b", caption: "x" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/17/media");
  assertEquals(Object.fromEntries(url.searchParams), {
    media_type: "CAROUSEL",
    children: "a,b",
    caption: "x",
  });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("create-carousel-container: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ igUserId: "17", children: "a, b", caption: "x" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});

Deno.test("create-carousel-container: rejects empty and over-10 children before fetching", async () => {
  for (const children of ["", Array.from({ length: 11 }, (_, i) => `k${i}`)]) {
    const { ctx, calls } = mockCtx([]);
    let threw = false;
    try {
      await action.execute!({ igUserId: "17", children }, ctx);
    } catch {
      threw = true;
    }
    assert(threw);
    assertEquals(calls.length, 0);
  }
});
