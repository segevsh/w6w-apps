// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import lyroDataSourceList from "../../actions/lyro-data-source-list.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("lyro-data-source-list: GET /lyro/data-sources", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data_sources": [
        {
          "id": "s1",
          "kind": "qa",
        },
      ],
      "meta": {
        "cursor": "c2",
        "limit": 100,
      },
    },
  }]);
  const out = await lyroDataSourceList.execute({
    "kind": "qa",
    "order": "asc",
  } as any, ctx) as Record<string, any>;
  const items = (out.items ?? []) as Array<Record<string, any>>;
  void items;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/lyro/data-sources");
  assertEquals(calls[0].url.startsWith("https://api.tidio.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "kind": "qa",
    "order": "asc",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.accept, "application/json; version=1");
  assertEquals(calls[0].headers["x-tidio-openapi-client-id"], undefined);
  assertEquals(out.count, 1);
  assertEquals(items[0].id, "s1");
});

Deno.test("lyro-data-source-list: a vendor error surfaces its code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { errors: [{ code: "not_found", message: "Nope" }] },
  }]);
  const err = await assertRejects(async () =>
    await lyroDataSourceList.execute({
      "kind": "qa",
      "order": "asc",
    } as any, ctx)
  ) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("not_found: Nope"), true);
});
