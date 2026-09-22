import { assertEquals } from "@std/assert";
import action from "../../actions/delete-client-record.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

Deno.test("delete-client-record: DELETEs /consultant/records/{recordId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute({ recordId: "rec-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/records/rec-1`);
  assertEquals(result, { status: 200 });
});

Deno.test("delete-client-record: a 202 with no body is a success, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined }]);
  assertEquals(await action.execute({ recordId: "rec-1" }, ctx), { status: 202 });
});

Deno.test("delete-client-record: a 404 is surfaced rather than swallowed", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  let message = "";
  try {
    await action.execute({ recordId: "gone" }, ctx);
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  assertEquals(message.includes("HTTP 404"), true, message);
});

Deno.test("delete-client-record: it is declared idempotent and reports the status", () => {
  assertEquals(action.idempotent, true);
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), ["status"]);
});
