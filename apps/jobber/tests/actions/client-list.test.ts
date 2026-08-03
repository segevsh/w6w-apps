import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-list.ts";

Deno.test("client-list: sends the clients query with a default page of 25 and no filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { clients: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("clients(filter: $filter"));
  // An all-unset filter is dropped, not sent as `{}` — see optionalInput.
  assertEquals(sent.variables, { first: 25 });
});

Deno.test("client-list: maps every filter onto Jobber's own names", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { clients: { nodes: [] } } } }]);
  await action.execute({
    searchTerm: "acme",
    isCompany: true,
    isLead: false,
    tags: "vip, net30",
    updatedAfter: "2026-01-01T00:00:00Z",
    updatedBefore: "2026-02-01T00:00:00Z",
    sortKey: "UPDATED_AT",
    sortDirection: "ASCENDING",
    first: 100,
    after: "cursor1",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {
    filter: {
      isCompany: true,
      isLead: false,
      tags: ["vip", "net30"],
      updatedAt: { after: "2026-01-01T00:00:00Z", before: "2026-02-01T00:00:00Z" },
    },
    searchTerm: "acme",
    sort: { key: "UPDATED_AT", direction: "ASCENDING" },
    first: 100,
    after: "cursor1",
  });
});

Deno.test("client-list: `sort` is a single object here, not a list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { clients: { nodes: [] } } } }]);
  await action.execute({ sortKey: "PRIMARY_NAME" }, ctx);
  const sort = JSON.parse(calls[0].body!).variables.sort;
  assert(!Array.isArray(sort), "clients takes ClientsSortInput, not a list");
});

Deno.test("client-list: an HTTP 200 with errors[] rejects", async () => {
  const { ctx } = mockCtx([{ body: { errors: [{ message: "nope" }], data: { clients: null } } }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "nope");
});
