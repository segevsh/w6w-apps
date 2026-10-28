import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-remind.ts";

Deno.test("request-remind: POST /requests/{id}/remind with no body", async () => {
  const { ctx, calls } = mockSignCtx([
    { body: { code: 0, status: "success", message: "Reminder has been sent" } },
  ]);

  const out = await action.execute({ requestId: "r1" }, ctx);

  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/requests/r1/remind");
  assertEquals(call.method, "POST");
  assertEquals(call.body, null);
  assertEquals(out, { code: 0, status: "success", message: "Reminder has been sent" });
});
