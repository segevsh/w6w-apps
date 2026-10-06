import { assertEquals } from "@std/assert";
import cancel from "../../actions/timeoff-request-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("timeoff-request-cancel: DELETEs the request and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await cancel.execute({ employeeId: "11", requestId: 3 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/employees/11/requests/3");
  assertEquals(out, { status: 200 });
});

Deno.test("timeoff-request-cancel: a 404 explains the possible missing module", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "request not found" } }]);
  let message = "";
  try {
    await cancel.execute({ employeeId: "11", requestId: 9 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("404") && message.includes("request not found"), true);
});
