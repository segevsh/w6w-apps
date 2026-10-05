import { assertEquals, assertRejects } from "@std/assert";
import legalHoldUpdate from "../../actions/legal-hold-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("legal-hold-update: PATCHes only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "lgh_x" } }]);
  await legalHoldUpdate.execute({ holdId: "lgh_x", name: "New", coversEntireWorkspace: true }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/legal-holds/lgh_x");
  assertEquals(JSON.parse(calls[0].body!), { name: "New", covers_entire_workspace: true });
});

Deno.test("legal-hold-update: coverage false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await legalHoldUpdate.execute({ holdId: "lgh_x", coversEntireWorkspace: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { covers_entire_workspace: false });
});

Deno.test("legal-hold-update: clearDescription sends null", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await legalHoldUpdate.execute({ holdId: "lgh_x", clearDescription: true, description: "z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { description: null });
});

Deno.test("legal-hold-update: a released hold (409) surfaces", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { code: "CONFLICT", message: "released" } }]);
  await assertRejects(
    async () => await legalHoldUpdate.execute({ holdId: "lgh_x", name: "n" }, ctx),
    Error,
    "released",
  );
});
