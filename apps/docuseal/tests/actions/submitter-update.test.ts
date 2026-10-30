import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submitter-update.ts";

test("submitter-update: sends only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }]);
  await action.execute!({ id: 7, email: "new@example.com" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.docuseal.com/submitters/7");
  assertEquals(JSON.parse(calls[0].body!), { email: "new@example.com" });
});

test("submitter-update: values parses as a JSON object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }]);
  await action.execute!({ id: 7, values: '{"Full Name":"John Doe"}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { values: { "Full Name": "John Doe" } });
});

/** Marking a submitter completed on their behalf is an explicit, meaningful boolean. */
test("submitter-update: completed:true reaches the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 7 } }]);
  await action.execute!({ id: 7, completed: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { completed: true });
});
