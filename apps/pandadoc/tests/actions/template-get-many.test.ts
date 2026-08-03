import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/template-get-many.ts";

Deno.test("template-get-many: GETs /templates mapping every filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: "t1", name: "MSA" }] } }]);
  const out = await action.execute({
    q: "MSA",
    id: "t1",
    folderUuid: "f1",
    tag: "legal",
    shared: true,
    deleted: false,
    fields: "content_date_modified",
    count: 100,
    page: 3,
  }, ctx);

  assertEquals(pathOf(calls[0]), "/public/v1/templates");
  const q = queryOf(calls[0]);
  assertEquals(q.get("q"), "MSA");
  assertEquals(q.get("id"), "t1");
  assertEquals(q.get("folder_uuid"), "f1");
  assertEquals(q.get("tag"), "legal");
  assertEquals(q.get("shared"), "true");
  assertEquals(q.get("deleted"), "false");
  assertEquals(q.get("fields"), "content_date_modified");
  assertEquals(q.get("count"), "100");
  assertEquals(q.get("page"), "3");
  assertEquals(out, { results: [{ id: "t1", name: "MSA" }] });
});

Deno.test("template-get-many: never sends an empty parameter (PandaDoc 400s on those)", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute({ q: "", tag: "", folderUuid: "" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("template-get-many: is a search action on the template resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "template");
});
