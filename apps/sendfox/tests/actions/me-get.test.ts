import { assertEquals } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf, user } from "../_helpers.ts";

Deno.test("me-get: GETs /me and returns the bare User entity", async () => {
  const { ctx, calls } = mockCtx([{ body: user() }]);
  const out = await meGet.execute({}, ctx) as { email: string; contacts_count: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(out.email, "owner@acme.example");
  assertEquals(out.contacts_count, 42);
});

/**
 * The reason `/me` is usable as this app's probe: it returns account metadata and
 * not the caller's own token.
 */
Deno.test("me-get: the response carries no credential material", async () => {
  const { ctx } = mockCtx([{ body: user() }]);
  const out = await meGet.execute({}, ctx);
  assertEquals(JSON.stringify(out).includes("token"), false);
});
