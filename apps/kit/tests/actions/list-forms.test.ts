import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/list-forms.ts";
import { mockCtx } from "../_helpers.ts";

test("list-forms: GETs /v4/forms with no params by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { forms: [], pagination: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/forms");
  assertEquals([...url.searchParams.keys()], []);
});

test("list-forms: forwards status, type, include and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { forms: [] } }]);
  await action.execute!(
    { status: "all", type: "hosted", include: "subscriber_count", perPage: 25 },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "all");
  assertEquals(p.get("type"), "hosted");
  assertEquals(p.get("include"), "subscriber_count");
  assertEquals(p.get("per_page"), "25");
});

test("list-forms: offers both form types Kit documents", () => {
  const type = action.params?.find((p) => p.key === "type");
  assert(type);
  const options = type.options as Array<{ value: unknown }>;
  assertEquals(options.map((o) => o.value), ["embed", "hosted"]);
});
