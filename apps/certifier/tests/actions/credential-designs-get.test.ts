import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/credential-designs-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const DESIGNS = [{ id: "d1", name: "Cert", previews: [{ format: "pdf", url: "https://x/p.pdf" }] }];

test("credential-designs-get: GET /v1/credentials/{id}/designs wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: DESIGNS }]);
  const out = await action.execute({ credentialId: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/credentials/c1/designs");
  assertEquals(out, { designs: DESIGNS });
});

test("credential-designs-get: a non-array body becomes an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute({ credentialId: "c1" }, ctx), { designs: [] });
});
