import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/insight-list.ts";

const conn = { display: { region: "us", projectId: "999" } };

test("insight-list: order and basic are sent only when set", async () => {
  const plain = mockCtx([{ body: { results: [] } }], { connection: conn });
  await action.execute!({}, plain.ctx);
  assertEquals(plain.calls[0].url, "https://us.posthog.com/api/projects/999/insights/");
  const sorted = mockCtx([{ body: { results: [] } }], { connection: conn });
  await action.execute!({ order: "-last_modified_at", basic: true }, sorted.ctx);
  const url = new URL(sorted.calls[0].url);
  assertEquals(url.searchParams.get("order"), "-last_modified_at");
  assertEquals(url.searchParams.get("basic"), "true");
});
