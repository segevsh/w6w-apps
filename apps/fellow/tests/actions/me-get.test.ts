import { assertEquals, assertRejects } from "@std/assert";
import meGet from "../../actions/me-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("me-get: GET /api/v1/me on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      user: { id: "u1", email: "a@b.c", full_name: "A B" },
      workspace: { id: "w1", name: "Acme", subdomain: "acme" },
    },
  }]);
  const out = await meGet.execute({ onBehalfOf: "boss@acme.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/me");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(calls[0].body, null);
  assertEquals((out as { user: { id: string } }).user.id, "u1");
});

Deno.test("me-get: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () => Promise.resolve(meGet.execute({ onBehalfOf: "boss@acme.com" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});

Deno.test("me-get: X-On-Behalf-Of is sent only when asked for", async () => {
  const a = mockCtx([{ body: { user: {}, workspace: {} } }, { body: { user: {}, workspace: {} } }]);
  await meGet.execute({ onBehalfOf: "boss@acme.com" }, a.ctx);
  await meGet.execute({}, a.ctx);
  assertEquals(a.calls[0].headers["x-on-behalf-of"], "boss@acme.com");
  assertEquals(a.calls[1].headers["x-on-behalf-of"], undefined);
});
