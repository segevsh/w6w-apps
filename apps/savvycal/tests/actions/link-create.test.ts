import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import linkCreate from "../../actions/link-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("link-create: personal scope posts to /v1/links", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "link_new" } }]);
  const out = await linkCreate.execute({
    name: "Intro",
    description: "d",
    privateName: "p",
    type: "single",
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/links");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Intro",
    description: "d",
    private_name: "p",
    type: "single",
  });
  assertEquals(out.id, "link_new");
});

test("link-create: a scope slug posts to /v1/scopes/{slug}/links", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await linkCreate.execute({ name: "Demo", scopeSlug: "acme-inc" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/scopes/acme-inc/links");
  assertEquals(JSON.parse(calls[0].body!), { name: "Demo" });
});
