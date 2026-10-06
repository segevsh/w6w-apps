import { assertEquals, assertRejects } from "@std/assert";
import prospectDelete from "../../actions/prospect-delete.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("prospect-delete: DELETE with ids and campaigns", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await prospectDelete.execute(
    { "id": "1,2", "campaigns_id": "9" } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/prospects");
  assertEquals(queryOf(calls[0].url), { "id": "1,2", "campaigns_id": "9" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.campaigns_id, "9");
});

Deno.test("prospect-delete: global delete leaves campaigns_id unset", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await prospectDelete.execute({ "id": ["5"] } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/prospects");
  assertEquals(queryOf(calls[0].url), { "id": "5" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.campaigns_id, null);
});

Deno.test("prospect-delete: refuses an empty id list", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await prospectDelete.execute({ "id": "" } as never, ctx),
    Error,
    "at least one prospect ID",
  );
  assertEquals(calls.length, 0);
});
