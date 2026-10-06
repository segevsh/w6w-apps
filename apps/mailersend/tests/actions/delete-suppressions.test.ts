import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/delete-suppressions.ts";
import { bodyOf, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-suppressions: DELETEs the list with ids in a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await exec(action, { type: "hard-bounces", ids: ["a1", "b2"], domainId: "d1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/suppressions/hard-bounces");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { domain_id: "d1", ids: ["a1", "b2"] });
  assertEquals(out, { deleted: true });
});

Deno.test("delete-suppressions: all:true empties the list and sends no ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  await exec(action, { type: "on-hold-list", all: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/suppressions/on-hold-list");
  assertEquals(bodyOf(calls[0]), { all: true });
});

Deno.test("delete-suppressions: needs ids or all, not both, and a known list", async () => {
  const { ctx, calls } = mockCtx([]);
  const run = (i: Record<string, unknown>) =>
    Promise.resolve().then(() => exec(action, i as never, ctx));
  await assertRejects(() => run({ type: "blocklist" }), Error, "ids, or set all");
  await assertRejects(() => run({ type: "blocklist", ids: ["a"], all: true }), Error, "not both");
  await assertRejects(() => run({ type: "nope", all: true }), Error, "unknown suppression list");
  assertEquals(calls.length, 0);
});

Deno.test("delete-suppressions: a 422 on a bad id is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      message: "The given data was invalid.",
      errors: { ids: ["The selected ids.0 is invalid."] },
    },
  }]);
  await assertRejects(
    () => exec(action, { type: "blocklist", ids: ["zz"] }, ctx),
    Error,
    "ids.0 is invalid",
  );
});
