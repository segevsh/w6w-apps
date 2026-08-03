import { assertEquals } from "@std/assert";
import action from "../../actions/create-tag.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-tag: POSTs the name to /v4/tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { tag: { id: 1, name: "VIP" } } }]);
  await action.execute!({ name: "VIP" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "VIP" });
});

Deno.test("create-tag: is idempotent — Kit returns the existing tag for a known name", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("create-tag: returns the tag envelope", async () => {
  const body = { tag: { id: 1, name: "VIP", created_at: "2026-01-01T00:00:00Z" } };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute!({ name: "vip" }, ctx), body);
});
