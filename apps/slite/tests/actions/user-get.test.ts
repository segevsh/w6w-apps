import { assertEquals, assertRejects } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("user-get: GET /v1/users/u%201 with the documented parameters", async () => {
  const response = { id: "u 1", displayName: "A", email: "a@b.c" };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await userGet.execute({ userId: "u 1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users/u%201");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("user-get: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await userGet.execute({ userId: "u 1" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});
