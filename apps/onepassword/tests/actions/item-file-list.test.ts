import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/item-file-list.ts";

Deno.test("item-file-list: lists attachments with their sizes", async () => {
  const { ctx, calls } = mockCtx([
    ok([{ id: "f1", name: "server.key", size: 1704 }, { id: "f2", name: "chain.pem", size: 3200 }]),
  ], { display });
  const result = await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx) as {
    count: number;
    totalBytes: number;
  };
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults/v1/items/i1/files");
  assertEquals(result.count, 2);
  assertEquals(result.totalBytes, 4904);
});

Deno.test("item-file-list: a sizeless entry does not make the total NaN", async () => {
  const { ctx } = mockCtx([ok([{ id: "f1" }, { id: "f2", size: 10 }])], { display });
  const result = await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx) as {
    totalBytes: number;
  };
  assertEquals(result.totalBytes, 10);
});

/** A filename names what the key is for. */
Deno.test("item-file-list: logs a count, never a filename", async () => {
  const { ctx, logs } = mockCtx([ok([{ id: "f1", name: "prod-server.key" }])], { display });
  await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx);
  assert(!JSON.stringify(logs).includes("prod-server"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("item-file-list: needs a vault and an item, and refuses Events", async () => {
  const noItem = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1" }, noItem.ctx),
    Error,
    "`itemId` is required",
  );
  const wrongSurface = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1" }, wrongSurface.ctx),
    Error,
    "**Connect**",
  );
});

/** Certificates and private keys do not fit in a field. */
Deno.test("item-file-list: says why attachments matter here", () => {
  assert(/certificates and private keys live/.test(action.description!), action.description);
});
