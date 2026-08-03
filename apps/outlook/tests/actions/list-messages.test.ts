import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-messages.ts";

Deno.test("list-messages: GETs /me/messages and maps the OData params", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "m1" }] } }]);
  const out = await action.execute({
    filter: "isRead eq false",
    select: ["id", "subject"],
    orderby: "receivedDateTime desc",
    top: 5,
    skip: 10,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/me/messages");
  assertEquals(url.searchParams.get("$filter"), "isRead eq false");
  assertEquals(url.searchParams.get("$select"), "id,subject");
  assertEquals(url.searchParams.get("$orderby"), "receivedDateTime desc");
  assertEquals(url.searchParams.get("$top"), "5");
  assertEquals(url.searchParams.get("$skip"), "10");
  assertEquals(out.value.length, 1);
});

Deno.test("list-messages: scopes to a mail folder, well-known names included", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ folderId: "inbox" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/mailFolders/inbox/messages");
});

Deno.test("list-messages: quotes the $search term for KQL", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ search: "from:alice" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$search"), '"from:alice"');
});

Deno.test("list-messages: sets Prefer for a plain-text body", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ bodyContentType: "text" }, ctx);
  assertEquals(calls[0].headers["prefer"], 'outlook.body-content-type="text"');
});

Deno.test("list-messages: replays a nextLink verbatim instead of rebuilding the query", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/messages?$skip=25&$top=25";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, top: 999, filter: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-messages: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/messages?$skip=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
  assertEquals(out.pages, 2);
});

Deno.test("list-messages: honours maxPages and hands back the cursor", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/messages?$skip=1";
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "a" }], "@odata.nextLink": next } }]);
  const out = await action.execute({ all: true, maxPages: 1 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.nextLink, next);
});
