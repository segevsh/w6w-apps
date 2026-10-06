import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-people.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("search-people: POSTs the query as arrays to /person/search and maps the page", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      profiles: [{ id: 1, name: "A" }, { id: 2, name: "B" }],
      pagination: { start: 1, next: 3, total: 50 },
    },
  }]);
  const out = await run(action, {
    current_title: "CEO, CTO",
    company_domain: "acme.com",
    page_size: 2,
  }, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/person/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    query: { current_title: ["CEO", "CTO"], company_domain: ["acme.com"] },
    start: 1,
    page_size: 2,
  });
  assertEquals(out.count, 2);
  assertEquals([out.nextStart, out.total], [3, 50]);
  assertEquals(out.profiles[1].name, "B");
});

Deno.test("search-people: accepts the documented bare-array response and pages on a full page", async () => {
  const { ctx } = mockCtx([{ status: 201, body: [{ id: 1 }, { id: 2 }] }]);
  const out = await run(action, { keyword: "data", page_size: 2, start: 5 }, ctx);
  assertEquals([out.count, out.start, out.nextStart], [2, 5, 7]);
});

Deno.test("search-people: refuses an empty search and surfaces a vendor 403", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, {}, none.ctx), Error, "at least one search filter");
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{ status: 403, body: { detail: "out of credits" } }]);
  await assertRejects(() => run(action, { keyword: "x" }, bad.ctx), Error, "out of credits");
});

Deno.test("search-people: declares a default page size of 10", () => {
  const p = action.params!.find((x) => x.key === "page_size");
  assertEquals(p?.default, 10);
});
