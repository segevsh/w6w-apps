import { assertEquals, assertRejects } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("me-get: GET /v1/me with the documented parameters", async () => {
  const response = {
    email: "a@b.c",
    displayName: "A",
    organizationName: "O",
    organizationDomain: "b.c",
  };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await meGet.execute({}, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/me");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("me-get: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await meGet.execute({}, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("me-get: declares no params", () => {
  assertEquals(meGet.params, []);
});
