import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/continue-prospect-search.ts";
import { bodyOf, exec, mockCtx } from "../_helpers.ts";

const listBody = { status: { code: 200 }, type: "list", data: { id: 4, status: "queued" } };

Deno.test("continue-prospect-search: posts the numeric list id and optional settings", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody }]);
  const out = await exec(action, {
    id: "123",
    maxProfiles: 10,
    callbackUrl: "https://example.com/h",
  }, ctx);
  assertEquals(calls[0].url, "https://wiza.co/api/prospects/continue_search");
  assertEquals(bodyOf(calls[0]), {
    id: 123,
    max_profiles: 10,
    callback_url: "https://example.com/h",
  });
  assertEquals(out, listBody.data);
});

Deno.test("continue-prospect-search: only the id is required", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody }]);
  await exec(action, { id: 5 }, ctx);
  assertEquals(bodyOf(calls[0]), { id: 5 });
});

Deno.test("continue-prospect-search: bad ids and sizes are refused locally; 404 fails", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { id: "abc" }, none.ctx), Error, "numeric");
  await assertRejects(
    () => exec(action, { id: 1, maxProfiles: 0 }, none.ctx),
    Error,
    "positive integer",
  );
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, message: "List not found" } }]);
  await assertRejects(() => exec(action, { id: 9 }, ctx), Error, "List not found");
});
