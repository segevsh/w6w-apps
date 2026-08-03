import { assertEquals } from "@std/assert";
import { ACCOUNT_BASE, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/template-list.ts";

Deno.test("template-list: GETs the account's templates", async () => {
  const { ctx, calls } = mockCtx([{ body: { envelopeTemplates: [{ templateId: "t1" }] } }]);
  const out = await action.execute({}, ctx) as { envelopeTemplates: Array<{ templateId: string }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), `${ACCOUNT_BASE}/templates`);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.envelopeTemplates[0].templateId, "t1");
});

Deno.test("template-list: maps every filter to Docusign's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    searchText: "nda",
    templateIds: "t1,t2",
    folderIds: "f1",
    include: "recipients",
    orderBy: "name",
    order: "asc",
    userFilter: "owned_by_me",
    sharedByMe: true,
    count: 25,
    startPosition: 25,
  }, ctx);

  const q = queryOf(calls[0]);
  assertEquals(q.get("search_text"), "nda");
  assertEquals(q.get("template_ids"), "t1,t2");
  assertEquals(q.get("folder_ids"), "f1");
  assertEquals(q.get("include"), "recipients");
  assertEquals(q.get("order_by"), "name");
  assertEquals(q.get("order"), "asc");
  assertEquals(q.get("user_filter"), "owned_by_me");
  assertEquals(q.get("shared_by_me"), "true");
  assertEquals(q.get("count"), "25");
  assertEquals(q.get("start_position"), "25");
});

Deno.test("template-list: is a search action grouped under template", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "template");
});
