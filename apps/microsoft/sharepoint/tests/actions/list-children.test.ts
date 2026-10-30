import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-children.ts";

test("list-children: no item addressed lists the library root", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drive/root/children");
  assertEquals(out.value, [{ id: "1" }]);
});

test("list-children: Item ID addresses that folder's children", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "F1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drive/items/F1/children");
});

test("list-children: Item path uses the structural colon form", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemPath: "Reports" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/sites/root/drive/root:/Reports:/children");
});

test("list-children: a Drive ID addresses another library directly", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ driveId: "b!abc" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/drives/b!abc/root/children");
});

test("list-children: offers no $filter param — the reference documents none for this collection", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("filter"), false);
});

test("list-children: Fetch all pages walks @odata.nextLink", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        value: [{ id: "1" }],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites/root/drive/root/children?$skiptoken=a",
      },
    },
    { body: { value: [{ id: "2" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.map((i) => i.id), ["1", "2"]);
});
