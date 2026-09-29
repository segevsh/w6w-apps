import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-get.ts";

Deno.test("request-get: GET /requests/{id} with no query params", async () => {
  const { ctx, calls } = mockSignCtx([
    {
      body: {
        code: 0,
        status: "success",
        requests: { request_id: "r1", request_status: "completed" },
      },
    },
  ]);

  const out = await action.execute({ requestId: "r1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/requests/r1");
  assertEquals(url.searchParams.has("data"), false);
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { request_id: "r1", request_status: "completed" });
});
