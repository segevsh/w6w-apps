import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableList from "../../actions/table-list.ts";

test("table-list: lists an organization's Database Tables", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        organization: { tables: { edges: [{ node: { id: "ZtEdWh", name: "Vendors" } }] } },
      },
    },
  }]);
  const out = await tableList.execute({ organizationId: "12345" }, ctx) as { tables: unknown[] };
  assertEquals(out.tables.length, 1);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(
    q,
    "{ organization(id: 12345) { tables { edges { node { id name internal_id } } } } }",
  );
});

test("table-list: first/after add the connection arguments and pageInfo, and return the cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        organization: {
          tables: {
            edges: [{ node: { id: "ZtEdWh" } }],
            pageInfo: { hasNextPage: true, endCursor: "CUR9" },
          },
        },
      },
    },
  }]);
  const out = await tableList.execute({ organizationId: "12345", first: 50, after: "CUR8" }, ctx);
  assertEquals(out, { tables: [{ id: "ZtEdWh" }], endCursor: "CUR9", hasNextPage: true });
  assertEquals(
    normalizeGql(JSON.parse(calls[0].body!).query),
    '{ organization(id: 12345) { tables(first: 50, after: "CUR8") { edges { node { id name internal_id } } pageInfo { hasNextPage endCursor } } } }',
  );
});

test("table-list: throws when the organization does not resolve", async () => {
  const { ctx } = mockCtx([{ body: { data: { organization: null } } }]);
  let threw = false;
  try {
    await tableList.execute({ organizationId: "bad" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

test("table-list: type/resource metadata", () => {
  assertEquals(tableList.type, "read");
  assertEquals(tableList.resource, "table");
});
