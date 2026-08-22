import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay } from "./_shared.ts";
import action from "../../actions/item-file-get.ts";

const file = {
  status: 200,
  body: "PRIVATEKEYBYTES",
  headers: { "content-type": "application/x-pem-file" },
};

/** Unlike everything else on Connect, this answers with bytes. */
Deno.test("item-file-get: fetches the content and returns it base64-encoded", async () => {
  const { ctx, calls } = mockCtx([file], { display });
  const result = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    fileId: "f1",
  }, ctx) as { data: string; size: number; contentType: string };
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults/v1/items/i1/files/f1/content");
  assertEquals(result.contentType, "application/x-pem-file");
  assertEquals(result.size, 15);
  assertEquals(atob(result.data), "PRIVATEKEYBYTES");
});

/** There is nothing about this file that is safe to log. */
Deno.test("item-file-get: logs only the size, and warns", async () => {
  const { ctx, logs } = mockCtx([file], { display });
  await action.execute!({ vaultId: "v1", itemId: "i1", fileId: "f1" }, ctx);
  assert(!JSON.stringify(logs).includes("PRIVATEKEY"), JSON.stringify(logs));
  assertEquals(logs[0].level, "warn");
  assertEquals(logs[0].data, { size: 15 });
});

Deno.test("item-file-get: an over-size attachment is refused", async () => {
  const big = { status: 200, body: "x".repeat(4_000_001), headers: {} };
  const { ctx } = mockCtx([big], { display });
  const error = await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", fileId: "f1" }, ctx),
    Error,
  );
  assert(/more likely a mistake than a key/.test(error.message), error.message);
});

Deno.test("item-file-get: an HTTP failure carries the status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }], { display });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", fileId: "f1" }, ctx),
    Error,
    "404",
  );
});

Deno.test("item-file-get: needs all three ids", async () => {
  for (
    const input of [
      { itemId: "i1", fileId: "f1" },
      { vaultId: "v1", fileId: "f1" },
      { vaultId: "v1", itemId: "i1" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(input, ctx), Error, "is required");
    assertEquals(calls.length, 0);
  }
});

/** The surface guard runs before any network call, not through the client. */
Deno.test("item-file-get: an Events connection is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", fileId: "f1" }, ctx),
    Error,
    "**Connect**",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-file-get: says there is nothing to redact", () => {
  assert(/the whole file is the secret/.test(action.description!), action.description);
});
