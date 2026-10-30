import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

test("delete-contact: DELETEs the :deleteContact verb with no query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await action.execute({ resourceName: "people/c1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/v1/people/c1:deleteContact");
  assertEquals([...url.searchParams.keys()], []);
  assertEquals(calls[0].body, null);
  assertEquals(result, { resourceName: "people/c1", success: true });
});

test("delete-contact: accepts a bare id and reports the normalised name", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute({ resourceName: "c42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/people/c42:deleteContact");
  assertEquals(result, { resourceName: "people/c42", success: true });
});

test("delete-contact: does not claim success when the API rejects the call", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: "gone" }]);
  await assertRejects(
    async () => await action.execute({ resourceName: "people/c1" }, ctx),
    Error,
    "Google People API 404",
  );
});

test("delete-contact: is idempotent — the end state is the same on a retry", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
