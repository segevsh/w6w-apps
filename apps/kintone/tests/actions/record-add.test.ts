import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-add.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

test("record-add: POSTs the record object and returns id/revision", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1", revision: "1" } }], conn);
  const out = await action.execute(
    { appId: "1", record: { Text: { value: "Sample" }, Number: { value: 1 } } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/record.json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { app: "1", record: { Text: { value: "Sample" }, Number: { value: 1 } } },
  );
  assertEquals(out, { id: "1", revision: "1" });
});

test("record-add: accepts `record` as a JSON string param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "2", revision: "1" } }], conn);
  await action.execute({ appId: "1", record: '{"Text":{"value":"x"}}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).record, { Text: { value: "x" } });
});

test("record-add: is declared not idempotent", () => {
  assertEquals(action.idempotent, false);
});
