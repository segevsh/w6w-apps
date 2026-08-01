import { assertEquals, assertRejects } from "@std/assert";
import { cfOk, mockCtx } from "../_helpers.ts";
import action from "../../actions/cache-purge.ts";

Deno.test("cache-purge: everything posts purge_everything", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk({ id: "z1" }) }]);
  await action.execute!({ zoneId: "z1", purgeType: "everything" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.cloudflare.com/client/v4/zones/z1/purge_cache");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { purge_everything: true });
});

Deno.test("cache-purge: files posts the file list", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: cfOk({ id: "z1" }) }]);
  await action.execute!(
    {
      zoneId: "z1",
      purgeType: "files",
      files: ["https://example.com/a.css", " https://example.com/b.js "],
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body, { files: ["https://example.com/a.css", "https://example.com/b.js"] });
});

Deno.test("cache-purge: files mode with no URLs rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "z1", purgeType: "files", files: [] }, ctx),
    Error,
    "`files`",
  );
});

Deno.test("cache-purge: missing zoneId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ zoneId: "", purgeType: "everything" }, ctx),
    Error,
    "`zoneId`",
  );
});
