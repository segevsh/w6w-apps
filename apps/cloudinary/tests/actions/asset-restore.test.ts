import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-restore.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-restore: posts the ids to the restore route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { a: {} } }], conn);
  await action.execute!({ publicIds: "a,b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/resources/image/upload/restore");
  assertEquals(new URLSearchParams(calls[0].body!).getAll("public_ids[]"), ["a", "b"]);
});

/** An empty result is Cloudinary's way of saying backups were off. */
Deno.test("asset-restore: an empty response is explained rather than passed on silently", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ publicIds: "a" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /backups/i.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("asset-restore: versions must line up with the ids", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ publicIds: "a,b", versions: "1" }, ctx),
    Error,
    "positionally",
  );
  assertEquals(calls.length, 0);
});
