import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

const page = {
  status: 200,
  body: {
    data: [
      { type: "organizations", id: "acme", attributes: { name: "acme" } },
      { type: "organizations", id: "labs", attributes: { name: "labs" } },
    ],
    meta: { pagination: { "current-page": 1, "next-page": 2, "total-count": 7 } },
  },
};

Deno.test("organization-list: lists organizations with page parameters", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ pageSize: 50, page: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/organizations");
  assertEquals(url.searchParams.get("page[size]"), "50");
  assertEquals(url.searchParams.get("page[number]"), "2");
});

/** The name IS the identifier — every other path starts with it. */
Deno.test("organization-list: returns the names, which are the ids", async () => {
  const { ctx } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.names, ["acme", "labs"]);
  assertEquals(result.count, 2);
  assertEquals(result.totalCount, 7);
  assertEquals(result.nextPage, 2);
  assert(/NAME is the identifier/.test(action.description!), action.description);
});

Deno.test("organization-list: the page size is clamped to what the API allows", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ pageSize: 5000, page: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page[size]"), "100");
  assertEquals(url.searchParams.get("page[number]"), "1");
});

Deno.test("organization-list: the last page reports no next page", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: [], meta: { pagination: { "current-page": 3, "next-page": null } } },
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.nextPage, undefined);
  assertEquals(result.count, 0);
});

Deno.test("organization-list: attributes come back under the API's own kebab-case names", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      data: [{ id: "acme", attributes: { name: "acme", "cost-estimation-enabled": true } }],
    },
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  const first = (result.organizations as Array<Record<string, unknown>>)[0];
  assertEquals(first["cost-estimation-enabled"], true);
});
