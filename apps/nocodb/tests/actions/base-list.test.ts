import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/base-list.ts";

const D = { display: { host: "https://nocodb.internal" } };
const bases = {
  status: 200,
  body: {
    list: [
      { id: "p1", title: "CRM", is_meta: true },
      { id: "p2", title: "Warehouse", is_meta: false },
    ],
  },
};

/** A write against an external base goes through to somebody's Postgres. */
Deno.test("base-list: flags bases backed by an external database", async () => {
  const { ctx, calls, logs } = mockCtx([bases], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/meta/bases");
  assertEquals(result.externalBases, ["Warehouse"]);
  assert(
    logs.some((l) => /go through to it/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("base-list: returns the ids table-list takes", async () => {
  const { ctx } = mockCtx([bases], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.ids, ["p1", "p2"]);
  assertEquals(result.titles, ["CRM", "Warehouse"]);
});

Deno.test("base-list: filters on the name here, case-insensitively", async () => {
  const { ctx, calls } = mockCtx([bases], D);
  const result = await action.execute({ nameContains: "crm" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(new URL(calls[0].url).search, "");
});

/** A token has no scope of its own. */
Deno.test("base-list: says the token's reach is its creator's", () => {
  assert(/no scope of its own/.test(action.description!), action.description);
});
