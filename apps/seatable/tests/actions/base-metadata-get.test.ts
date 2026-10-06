import { assertEquals, assertRejects } from "@std/assert";
import baseMetadataGet from "../../actions/base-metadata-get.ts";
import { BASE_PATH, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("base-metadata-get: GETs /metadata/ of the connected base", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { tables: [{ name: "Table1" }] } } }]);
  const out = await baseMetadataGet.execute({}, ctx) as { metadata: { tables: unknown[] } };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/metadata/`);
  assertEquals(out.metadata.tables.length, 1);
});

Deno.test("base-metadata-get: no Authorization header is set by the action", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { tables: [] } } }]);
  await baseMetadataGet.execute({}, ctx);
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("base-metadata-get: a connection without a base is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], { connected: false });
  await assertRejects(
    async () => {
      await baseMetadataGet.execute({}, ctx);
    },
    Error,
    "no base",
  );
  assertEquals(calls.length, 0);
});

Deno.test("base-metadata-get: a gateway error surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error_message: "invalid token" } }]);
  await assertRejects(
    async () => {
      await baseMetadataGet.execute({}, ctx);
    },
    Error,
    "403: invalid token",
  );
});
