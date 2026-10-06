import { assertEquals, assertRejects } from "@std/assert";
import linkGet from "../../actions/link-get.ts";
import linkBulkUpdate from "../../actions/link-bulk-update.ts";
import linkBulkDelete from "../../actions/link-bulk-delete.ts";
import linkDelete from "../../actions/link-delete.ts";
import domainCheck from "../../actions/domain-check-availability.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("link-get: needs an ID, an external ID, or domain + slug", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await linkGet.execute!({ domain: "dub.sh" }, ctx),
    Error,
    "domain and slug",
  );
  assertEquals(calls.length, 0);
});

Deno.test("link-bulk-update: needs link IDs or external IDs", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await linkBulkUpdate.execute!({ archived: true }, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("link-bulk-update: external IDs alone are sent, with no linkIds key", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await linkBulkUpdate.execute!({ externalIds: ["e1"], tagNames: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { externalIds: ["e1"], data: { tagNames: ["x"] } });
});

Deno.test("link-bulk-delete: refuses nothing-to-delete and more than 100 IDs", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await linkBulkDelete.execute!({ linkIds: "" }, ctx),
    Error,
    "at least one",
  );
  const ids = Array.from({ length: 101 }, (_, i) => `l${i}`);
  await assertRejects(
    async () => await linkBulkDelete.execute!({ linkIds: ids }, ctx),
    Error,
    "at most 100",
  );
  assertEquals(calls.length, 0);
});

Deno.test("link-delete: percent-encodes the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await linkDelete.execute!({ linkId: "ext_a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/links/ext_a%2Fb%20c");
});

Deno.test("domain-check-availability: needs at least one domain", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await domainCheck.execute!({ domains: [] }, ctx),
    Error,
    "at least one",
  );
});
