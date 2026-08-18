import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/item-list.ts";

const items = ok([
  { id: "i1", title: "Production database", category: "DATABASE" },
  { id: "i2", title: "Staging database", category: "DATABASE" },
  { id: "i3", title: "Admin login", category: "LOGIN" },
]);

Deno.test("item-list: lists a vault's items", async () => {
  const { ctx, calls } = mockCtx([items], { display });
  const result = await action.execute!({ vaultId: "v1" }, ctx) as {
    count: number;
    total: number;
    ids: string[];
  };
  assertEquals(new URL(calls[0].url).pathname, "/v1/vaults/v1/items");
  assertEquals(result.count, 3);
  assertEquals(result.total, 3);
  assertEquals(result.ids.length, 3);
});

/** SCIM's `eq` is exact, and there is no `contains`. */
Deno.test("item-list: an exact title becomes a SCIM filter", async () => {
  const { ctx, calls } = mockCtx([items], { display });
  await action.execute!({ vaultId: "v1", title: "Production database" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    'title eq "Production database"',
  );
});

Deno.test("item-list: a substring match is applied here, because the API cannot", async () => {
  const { ctx, calls } = mockCtx([items], { display });
  const result = await action.execute!({ vaultId: "v1", titleContains: "database" }, ctx) as {
    count: number;
    total: number;
  };
  assertEquals(new URL(calls[0].url).searchParams.has("filter"), false);
  assertEquals(result.count, 2);
  assertEquals(result.total, 3, "the vault still returned everything");
});

Deno.test("item-list: a category filter narrows further", async () => {
  const { ctx } = mockCtx([items], { display });
  const result = await action.execute!({ vaultId: "v1", category: "login" }, ctx) as {
    count: number;
  };
  assertEquals(result.count, 1);
});

/** A quote in the title would break the SCIM clause. */
Deno.test("item-list: a quote in the title is stripped rather than breaking the filter", async () => {
  const { ctx, calls } = mockCtx([items], { display });
  await action.execute!({ vaultId: "v1", title: 'the "old" one' }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), 'title eq "the old one"');
});

/** An item title names the thing the secret is for. */
Deno.test("item-list: logs counts, never a title", async () => {
  const { ctx, logs } = mockCtx([items], { display });
  await action.execute!({ vaultId: "v1" }, ctx);
  assert(!JSON.stringify(logs).includes("Production"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 3, total: 3 });
});

Deno.test("item-list: needs a vault, and refuses an Events connection", async () => {
  const noVault = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({}, noVault.ctx),
    Error,
    "`vaultId` is required",
  );

  const wrongSurface = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1" }, wrongSurface.ctx),
    Error,
    "**Connect**",
  );
});

/** The list endpoint never returns values, whatever they are. */
Deno.test("item-list: says it never returns field values", () => {
  assert(/NEVER returns field values/.test(action.description!), action.description);
});
