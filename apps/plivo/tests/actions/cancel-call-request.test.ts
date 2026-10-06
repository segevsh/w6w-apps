import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/cancel-call-request.ts";

Deno.test("cancel-call-request: DELETEs Request/{id}/ and reports success on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], CONN);
  const out = await action.execute!({ requestUuid: " req-1 " }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, BASE + "Request/req-1/");
  assertEquals((out as Record<string, unknown>).cancelled, true);
  assertEquals((out as Record<string, unknown>).requestUuid, "req-1");
});

Deno.test("cancel-call-request: a blank id never reaches the network", async () => {
  // Plivo's DELETE on the collection path hangs up / cancels everything, so an
  // empty variable must stop here.
  const { ctx, calls } = mockCtx([], CONN);
  await assertRejects(
    async () => await action.execute!({ requestUuid: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("cancel-call-request: a 404 is thrown", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }], CONN);
  await assertRejects(
    async () => await action.execute!({ requestUuid: "zz" }, ctx),
    Error,
    "Plivo 404",
  );
});
