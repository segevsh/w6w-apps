import { assertEquals, assertRejects } from "@std/assert";
import groupGet from "../../actions/group-get.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("group-get: GET /v1/groups/g1 with the documented parameters", async () => {
  const response = { id: "g1", name: "Eng", description: "" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await groupGet.execute({ groupId: "g1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/groups/g1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("group-get: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await groupGet.execute({ groupId: "g1" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
