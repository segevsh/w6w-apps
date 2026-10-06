import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/link-bulk-create.ts";
import { LINK, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-bulk-create: POSTs /links/bulk and counts per-element failures", async () => {
  const { ctx, calls } = mockCtx([{ body: [LINK, { error: "Invalid URL" }] }]);
  const out = await action.execute({
    domain: "go.example.com",
    links: [{ originalURL: "https://a.test" }, { originalURL: "nope" }],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/links/bulk");
  assertEquals(JSON.parse(calls[0].body!).domain, "go.example.com");
  assertEquals(out.failed, 1);
  assertEquals(out.results.length, 2);
  assert(!("password" in out.results[0]));
});

Deno.test("link-bulk-create: rejects an empty or oversized batch before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ domain: "d", links: [] }, ctx),
    Error,
    "non-empty",
  );
  const many = Array.from({ length: 1001 }, () => ({ originalURL: "https://a.test" }));
  await assertRejects(
    async () => await action.execute({ domain: "d", links: many }, ctx),
    Error,
    "1000",
  );
  assertEquals(calls.length, 0);
});
