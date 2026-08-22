import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

const describe = { status: 200, body: { name: "idx", host: "idx-abc.svc.aped-1.pinecone.io" } };

/** camelCase: setMetadata, not set_metadata. */
Deno.test("record-update: metadata merges through setMetadata", async () => {
  const { ctx, calls } = mockCtx([describe, { status: 200, body: {} }]);
  await action.execute!({ indexName: "idx", id: "a", setMetadata: '{"status":"archived"}' }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/vectors/update");
  assertEquals(JSON.parse(calls[1].body!), { id: "a", setMetadata: { status: "archived" } });
});

Deno.test("record-update: an update with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ indexName: "idx", id: "a" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("record-update: says that a metadata key cannot be removed this way", () => {
  assert(/cannot be removed|cannot be deleted/i.test(action.description!), action.description);
});
