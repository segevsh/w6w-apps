import { assert, assertEquals } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("me-get: GET /me and returns the token description", async () => {
  const body = {
    name: "CI",
    scopes: ["forms:read"],
    expiresAt: null,
    lastUsedAt: null,
    createdAt: "x",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await meGet.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v1/me");
  assertEquals(out, body);
});

Deno.test("me-get: sets no Authorization header itself and takes no params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await meGet.execute({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assert(meGet.params?.length === 0);
});
