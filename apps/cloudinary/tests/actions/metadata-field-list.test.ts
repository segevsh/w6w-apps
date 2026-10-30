import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/metadata-field-list.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

test("metadata-field-list: reads the account's structured metadata schema", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { metadata_fields: [] } }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/metadata_fields");
});
