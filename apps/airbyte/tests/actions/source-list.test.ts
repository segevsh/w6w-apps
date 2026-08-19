import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/source-list.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const sources = {
  status: 200,
  body: {
    data: [
      { sourceId: "s1", name: "Prod Postgres", sourceType: "postgres" },
      { sourceId: "s2", name: "Stripe", sourceType: "stripe" },
      { sourceId: "s3", name: "Replica Postgres", sourceType: "postgres" },
    ],
  },
};

Deno.test("source-list: counts the connector types in use", async () => {
  const { ctx, calls } = mockCtx([sources], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/sources");
  assertEquals(result.byType, { postgres: 2, stripe: 1 });
  assertEquals(result.types, ["postgres", "stripe"]);
});

Deno.test("source-list: the type filter is applied here, not by Airbyte", async () => {
  const { ctx, calls } = mockCtx([sources], D);
  const result = await action.execute({ sourceType: "POSTGRES" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 2);
  assertEquals(new URL(calls[0].url).searchParams.get("sourceType"), null);
});

Deno.test("source-list: the workspace filter and paging reach the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], D);
  await action.execute({ workspaceIds: "w1, w2", limit: 10, offset: 20 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("workspaceIds"), "w1,w2");
  assertEquals(q.get("limit"), "10");
  assertEquals(q.get("offset"), "20");
});

/** Airbyte concentrates credentials by design. */
Deno.test("source-list: says the list is the inventory of what a compromise reaches", () => {
  assert(/one compromise of Airbyte would reach/.test(action.description!), action.description);
});
