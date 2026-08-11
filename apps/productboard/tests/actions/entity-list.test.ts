import { assertEquals } from "@std/assert";
import action from "../../actions/entity-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("entity-list: GETs /v2/entities and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "1" }, { id: "2" }], "cur-2") }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities");
  assertEquals(out.items.length, 2);
  assertEquals(out.nextPageCursor, "cur-2");
  assertEquals(out.hasMore, true);
});

Deno.test("entity-list: bracketed filters are sent as literal bracketed keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({
    ownerEmail: "jane@example.com",
    statusName: "In Progress",
    teamsName: "Platform",
    parentId: "p-1",
    sourceSystem: "sfdc",
    sourceRecordId: "A-1",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    "owner[email]": "jane@example.com",
    "status[name]": "In Progress",
    "teams[name]": "Platform",
    "parent[id]": "p-1",
    "metadata[source][system]": "sfdc",
    "metadata[source][recordId]": "A-1",
  });
});

Deno.test("entity-list: types are repeated keys and fields uses the bracketed spelling", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ types: ["feature", "subfeature"], fields: "name,status" }, ctx);
  assertEquals(queryAll(calls[0].url, "type[]"), ["feature", "subfeature"]);
  assertEquals(queryAll(calls[0].url, "fields[]"), ["name", "status"]);
});

Deno.test("entity-list: archived=false survives, because it is a meaningful filter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await action.execute({ archived: false }, ctx);
  assertEquals(queryOf(calls[0].url), { archived: "false" });
});
