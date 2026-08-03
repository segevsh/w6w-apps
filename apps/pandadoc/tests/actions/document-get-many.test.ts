import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/document-get-many.ts";

Deno.test("document-get-many: GETs /documents mapping every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ id: "d1" }] } }]);
  const out = await action.execute({
    q: "renewal",
    status: 1,
    statusNe: 12,
    templateId: "t1",
    folderUuid: "f1",
    contactId: "c1",
    membershipId: "m1",
    tag: "q3",
    orderBy: "-date_created",
    createdFrom: "2026-01-01T00:00:00Z",
    createdTo: "2026-02-01T00:00:00Z",
    modifiedFrom: "2026-01-05T00:00:00Z",
    modifiedTo: "2026-01-06T00:00:00Z",
    completedFrom: "2026-01-07T00:00:00Z",
    completedTo: "2026-01-08T00:00:00Z",
    deleted: true,
    id: "d1",
    count: 25,
    page: 2,
  }, ctx);

  assertEquals(pathOf(calls[0]), "/public/v1/documents");
  const q = queryOf(calls[0]);
  assertEquals(q.get("q"), "renewal");
  assertEquals(q.get("status"), "1");
  assertEquals(q.get("status__ne"), "12");
  assertEquals(q.get("template_id"), "t1");
  assertEquals(q.get("folder_uuid"), "f1");
  assertEquals(q.get("contact_id"), "c1");
  assertEquals(q.get("membership_id"), "m1");
  assertEquals(q.get("tag"), "q3");
  assertEquals(q.get("order_by"), "-date_created");
  assertEquals(q.get("created_from"), "2026-01-01T00:00:00Z");
  assertEquals(q.get("created_to"), "2026-02-01T00:00:00Z");
  assertEquals(q.get("modified_from"), "2026-01-05T00:00:00Z");
  assertEquals(q.get("modified_to"), "2026-01-06T00:00:00Z");
  assertEquals(q.get("completed_from"), "2026-01-07T00:00:00Z");
  assertEquals(q.get("completed_to"), "2026-01-08T00:00:00Z");
  assertEquals(q.get("deleted"), "true");
  assertEquals(q.get("id"), "d1");
  assertEquals(q.get("count"), "25");
  assertEquals(q.get("page"), "2");
  assertEquals(out, { results: [{ id: "d1" }] });
});

Deno.test("document-get-many: sends no query at all when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("document-get-many: is a search action on the document resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "document");
});
