import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/request-list.ts";

Deno.test("request-list: sort is a LIST here — Jobber changed the type in 2024-11-12", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { requests: { nodes: [] } } } }]);
  await action.execute({ sortKey: "REQUESTED_AT", sortDirection: "ASCENDING" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(sent.query.includes("$sort: [RequestsSortInput!]"));
  assertEquals(sent.variables.sort, [{ key: "REQUESTED_AT", direction: "ASCENDING" }]);
});

Deno.test("request-list: filters map onto Jobber's names", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { requests: { nodes: [] } } } }]);
  await action.execute({
    clientId: "c1",
    propertyId: "p1",
    status: "new",
    assignedTo: "u1",
    updatedAfter: "2026-01-01T00:00:00Z",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, {
    clientId: "c1",
    propertyId: "p1",
    status: "new",
    assignedTo: "u1",
    updatedAt: { after: "2026-01-01T00:00:00Z" },
  });
});
