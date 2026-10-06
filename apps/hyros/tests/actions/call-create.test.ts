import { assertEquals } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import callCreate from "../../actions/call-create.ts";

Deno.test("call-create: POST /calls with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await callCreate.execute({
    name: "Intro",
    email: "j@x.io",
    state: "QUALIFIED",
    externalId: "c1",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/calls");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Intro",
    email: "j@x.io",
    externalId: "c1",
    state: "QUALIFIED",
  });
  assertEquals(out, { requestId: "req1", result: "OK" });
});
