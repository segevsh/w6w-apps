import { test } from "node:test";
import assert from "node:assert/strict";
import { objectInput, query } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";
import { unauthorized } from "../fixtures.ts";

test("GraphQL uses only host fetch, with variables and no authorization or logging", async () => {
  const { ctx, calls, logs } = mockCtx([{ body: { data: { viewer: { id: "p" } } } }]);
  await query(ctx, "query Q($id: ID!) { node(id: $id) { id } }", { id: 'a"} injection' }, "Q");
  assert.equal(calls[0].url, "https://partners-endpoint.dice.fm/graphql");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers.authorization, undefined);
  assert.deepEqual(JSON.parse(calls[0].body!).variables, { id: 'a"} injection' });
  assert.equal(JSON.parse(calls[0].body!).operationName, "Q");
  assert.deepEqual(logs, []);
});

for (const status of [200, 401, 500]) {
  test(`DICE's auth envelope is rejected independently of HTTP ${status}`, async () => {
    const { ctx } = mockCtx([{ status, body: unauthorized }]);
    await assert.rejects(() => query(ctx, "{ viewer { id } }"), /error_unauthorized/);
  });
}
for (const data of [undefined, { viewer: { id: "partial" } }]) {
  test(`GraphQL errors fail ${data ? "partial success" : "empty data"} and do not echo values`, async () => {
    const { ctx } = mockCtx([{
      body: { data, errors: [{ message: "private-email@example.com" }] },
    }]);
    await assert.rejects(() => query(ctx, "{ viewer { id } }"), (error: Error) => {
      assert.match(error.message, /GraphQL error/);
      assert.equal(error.message.includes("private-email"), false);
      return true;
    });
  });
}
for (
  const body of ["<html>proxy</html>", [], null, {}, { data: null }, { data: [] }, {
    data: {},
    errors: {},
  }]
) {
  test(`reject malformed response ${JSON.stringify(body)}`, async () => {
    const { ctx } = mockCtx([{ body }]);
    await assert.rejects(() => query(ctx, "{ viewer { id } }"));
  });
}
test("HTTP errors fail even when carrying a data object", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { data: {} } }]);
  await assert.rejects(() => query(ctx, "{ viewer { id } }"), /429/);
});
test("JSON input allows object or serialized object and rejects nonobjects", () => {
  assert.deepEqual(objectInput('{"x":null}', "variables"), { x: null });
  assert.deepEqual(objectInput(undefined, "variables"), {});
  for (const input of [null, [], "[]", "null", "{bad", 1]) {
    assert.throws(() => objectInput(input, "variables"), /variables/);
  }
});
