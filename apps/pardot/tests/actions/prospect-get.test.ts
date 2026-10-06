import { assertEquals, assertRejects } from "@std/assert";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/prospect-get.ts";

Deno.test("prospect-get: GETs /prospects/<id> with the default fields", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: { id: 101 } }]);
  const out = await action.execute({ id: 101 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v5/objects/prospects/101");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("fields")!.split(",")[0], "id");
  assertEquals(out, { id: 101 });
});

Deno.test("prospect-get: honours a caller field list", async () => {
  const { ctx, calls } = mockPardotCtx([{ body: {} }]);
  await action.execute({ id: 101, fields: "id,campaign.name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "id,campaign.name");
});

Deno.test("prospect-get: refuses a non-numeric id before any request", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(
    async () => await action.execute({ id: "1/../2" as unknown as number }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
