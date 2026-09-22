import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/end-active-conference.ts";

Deno.test("end-active-conference: POSTs to the custom-method path with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const result = await action.execute!({ name: "spaces/abc" }, ctx);
  assertEquals(result, {});
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.host, "meet.googleapis.com");
  assertEquals(url.pathname, "/v2/spaces/abc:endActiveConference");
  assertEquals(calls[0].body, null);
});

Deno.test("end-active-conference: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.type, "perform");
});
