import { assertEquals, assertRejects } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const meta = { total: 1, page: 0, limit: 50, hasNext: false };

Deno.test("contact-list: defaults to page 0, limit 50 and returns data with meta", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "c1" }], meta) }]);
  const out = await contactList.execute({ funnelId: "fnl_1" }, ctx) as {
    data: unknown[];
    meta: unknown;
  };
  assertEquals(pathOf(calls[0].url), "/v1/funnels/fnl_1/contacts");
  assertEquals(queryOf(calls[0].url), { page: "0", limit: "50" });
  assertEquals(out.data.length, 1);
  assertEquals(out.meta, meta);
});

Deno.test("contact-list: forwards page, limit and sort", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([], meta) }]);
  await contactList.execute(
    { funnelId: "f", page: 2, limit: 100, sortField: "email", sortOrder: "1" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    page: "2",
    limit: "100",
    sortField: "email",
    sortOrder: "1",
  });
});

Deno.test("contact-list: rejects out-of-range paging before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  for (const input of [{ limit: 101 }, { limit: 0 }, { page: -1 }, { sortOrder: "2" }]) {
    await assertRejects(() =>
      Promise.resolve(contactList.execute({ funnelId: "f", ...input }, ctx))
    );
  }
  assertEquals(calls.length, 0);
});

Deno.test("contact-list: a slash in the funnel id cannot escape the path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([], meta) }]);
  await contactList.execute({ funnelId: "a/../b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/funnels/a%2F..%2Fb/contacts");
});

Deno.test("contact-list: surfaces the vendor error", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "no crm:read", status: 403 } }]);
  const err = await assertRejects(() =>
    Promise.resolve(contactList.execute({ funnelId: "f" }, ctx))
  );
  assertEquals((err as Error).message, "Perspective 403: no crm:read");
});
