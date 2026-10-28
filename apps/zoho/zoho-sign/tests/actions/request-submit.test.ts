import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-submit.ts";

Deno.test("request-submit: urlencoded POST to /requests/{id}/submit with a data= body", async () => {
  const { ctx, calls } = mockSignCtx([
    {
      body: {
        code: 0,
        status: "success",
        requests: { request_id: "r1", request_status: "inprogress" },
      },
    },
  ]);

  const out = await action.execute({
    requestId: "r1",
    actions: [{ action_id: "a1", action_type: "SIGN" }],
    notes: "hi",
  }, ctx);

  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/requests/r1/submit");
  assertEquals(call.method, "POST");
  assertEquals(call.headers["content-type"], "application/x-www-form-urlencoded");

  const params = new URLSearchParams(call.body!);
  const data = JSON.parse(params.get("data")!);
  assertEquals(data, {
    requests: { notes: "hi", actions: [{ action_id: "a1", action_type: "SIGN" }] },
  });
  assertEquals(out, { request_id: "r1", request_status: "inprogress" });
});
