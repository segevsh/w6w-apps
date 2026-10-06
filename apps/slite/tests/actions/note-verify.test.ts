import { assertEquals, assertRejects } from "@std/assert";
import noteVerify from "../../actions/note-verify.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("note-verify: PUT /v1/notes/n1/verify with the documented parameters", async () => {
  const response = { id: "n1", reviewState: "Verified" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await noteVerify.execute({ noteId: "n1", until: "2027-01-01T00:00:00.000Z" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/notes/n1/verify");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { until: "2027-01-01T00:00:00.000Z" });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("note-verify: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await noteVerify.execute({ noteId: "n1", until: "2027-01-01T00:00:00.000Z" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("note-verify: no expiry is sent as an explicit null, because `until` is required", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "n1" } }]);
  await noteVerify.execute({ noteId: "n1" }, ctx);
  assertEquals(calls[0].body, '{"until":null}');
});
