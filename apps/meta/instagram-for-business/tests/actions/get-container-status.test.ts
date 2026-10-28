import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-container-status.ts";

Deno.test("get-container-status: GET /k1 with the documented query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", data: [] } }]);
  await action.execute!({ containerId: "k1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://graph.facebook.com");
  assertEquals(url.pathname, "/v23.0/k1");
  assertEquals(Object.fromEntries(url.searchParams), { fields: "status_code,status" });
  assert(!("authorization" in calls[0].headers));
});

Deno.test("get-container-status: surfaces a Graph error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { message: "bad", code: 100 } } }]);
  let msg = "";
  try {
    await action.execute!({ containerId: "k1" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assert(msg.includes("bad"));
});
