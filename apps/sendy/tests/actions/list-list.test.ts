import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-list.ts";

const conn = { display: { baseUrl: "https://example.com/sendy" } };

test("list-list: parses the documented JSON success shape", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: JSON.stringify([{ id: "l1", name: "Newsletter" }]) }],
    conn,
  );
  const result = await action.execute({ brandId: "b1" }, ctx);
  assertEquals(calls[0].url, "https://example.com/sendy/api/lists/get-lists.php");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("brand_id"), "b1");
  assertEquals(result, { lists: [{ id: "l1", name: "Newsletter" }] });
});

test("list-list: include_hidden is only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ body: "[]" }], conn);
  await action.execute({ brandId: "b1", includeHidden: true }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("include_hidden"), "yes");
});

test("list-list: a plain-text error is not silently parsed as JSON", async () => {
  const { ctx } = mockCtx([{ body: "Brand does not exist" }], conn);
  await assertRejects(
    async () => await action.execute({ brandId: "b1" }, ctx),
    Error,
    "Brand does not exist",
  );
});
