import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/connection-schema-get.ts";

/** "Why is that column missing" is usually disabled rather than broken. */
Deno.test("connection-schema-get: counts the enabled and disabled tables", async () => {
  const { ctx, calls } = mockCtx([ok({
    schema_change_handling: "ALLOW_ALL",
    schemas: {
      public: {
        enabled: true,
        tables: {
          orders: { enabled: true },
          customers: { enabled: true },
          audit_log: { enabled: false },
        },
      },
      staging: { enabled: true, tables: { tmp: { enabled: false } } },
    },
  })]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as {
    schemaCount: number;
    enabledTables: number;
    disabledTables: number;
  };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections/c1/schemas");
  assertEquals(result.schemaCount, 2);
  assertEquals(result.enabledTables, 2);
  assertEquals(result.disabledTables, 2);
});

Deno.test("connection-schema-get: a config with no schemas counts to zero", async () => {
  const { ctx } = mockCtx([ok({})]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as { schemaCount: number };
  assertEquals(result.schemaCount, 0);
});

Deno.test("connection-schema-get: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});

Deno.test("connection-schema-get: names the question it answers", () => {
  assert(/why is that column missing/i.test(action.description!), action.description);
});
