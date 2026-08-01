import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-request.ts";

Deno.test("get-request: GETs /api/bin/:binId/req/:reqId", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        method: "POST",
        path: "/YS4il4gS",
        headers: { "user-agent": "curl/7.35.0" },
        query: {},
        body: { hello: "world" },
        ip: "1.2.3.4",
        binId: "YS4il4gS",
        inserted: 1439468475026,
      },
    },
  ]);
  const out = await action.execute({ binId: "YS4il4gS", requestId: "YC61MdHw" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://www.postb.in/api/bin/YS4il4gS/req/YC61MdHw");
  assertEquals(out.method, "POST");
  assertEquals(out.ip, "1.2.3.4");
  assertEquals(out.body, { hello: "world" });
});
