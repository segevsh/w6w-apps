import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-list.ts";

Deno.test("template-list: lists with the default limit, no filters on the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: 1 }], pagination: {} } }]);
  assertEquals(await action.execute!({}, ctx), [{ id: 1 }]);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("limit"), "10");
  assertEquals(q.get("archived"), null);
  assertEquals(q.get("q"), null);
});

Deno.test("template-list: filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], pagination: {} } }]);
  await action.execute!({
    q: "nda",
    slug: "abc",
    externalId: "ext1",
    folder: "Contracts",
    archived: true,
    shared: true,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("q"), "nda");
  assertEquals(q.get("slug"), "abc");
  assertEquals(q.get("external_id"), "ext1");
  assertEquals(q.get("folder"), "Contracts");
  assertEquals(q.get("archived"), "true");
  assertEquals(q.get("shared"), "true");
});

Deno.test("template-list: returnAll follows the pagination cursor", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: 1 }], pagination: { next: 1 } } },
    { status: 200, body: { data: [{ id: 2 }], pagination: { next: null } } },
  ]);
  const items = await action.execute!({ returnAll: true }, ctx);
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(calls.length, 2);
});
