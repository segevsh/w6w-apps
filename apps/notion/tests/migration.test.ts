import { assertEquals, assertRejects } from "@std/assert";
import createPage from "../actions/create-page.ts";
import createRow from "../actions/create-database-page.ts";
import queryRows from "../actions/get-many-database-pages.ts";
import listDatabases from "../actions/list-databases.ts";
import manyDatabases from "../actions/get-many-databases.ts";
import updatePage from "../actions/update-page.ts";
import getProperty from "../actions/get-page-property.ts";
import session from "../actions/update-session.ts";
import { NotionClient, NotionError } from "../lib/client.ts";
import { mockCtx } from "./_helpers.ts";

Deno.test("Create Page supports parentless, untitled workspace pages and correct title properties", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await createPage.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  await createPage.execute({
    title: "Hello",
    markdown: "# Content\n\nText",
    markdownVersion: "v2",
    allowAsync: true,
  }, ctx);
  assertEquals(JSON.parse(calls[1].body!), {
    properties: { title: { title: [{ text: { content: "Hello" } }] } },
    markdown: "# Content\n\nText",
    markdown_version: "v2",
    allow_async: true,
  });
  assertEquals(createPage.params?.find((p) => p.key === "parentPageId")?.required, undefined);
  assertEquals(createPage.params?.find((p) => p.key === "title")?.required, undefined);
});

Deno.test("Create Page accepts a copied Notion URL without treating its view query as the parent ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await createPage.execute({
    parentType: "page",
    parentPageId: "https://www.notion.so/Notes-a3f51b1002164c728983956c44a70d25?v=another-id",
    title: "Child",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parent, { page_id: "a3f51b1002164c728983956c44a70d25" });
});

Deno.test("Create Page rejects conflicting content and parent inputs before sending", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await createPage.execute({ children: [], markdown: "x" }, ctx),
    Error,
    "only one content",
  );
  await assertRejects(
    async () => await createPage.execute({ template: { type: "default" }, children: [] }, ctx),
    Error,
    "template",
  );
  await assertRejects(
    async () => await createPage.execute({ markdownVersion: "v2" }, ctx),
    Error,
    "require Markdown",
  );
  await assertRejects(
    async () => await createPage.execute({ parentType: "page" }, ctx),
    Error,
    "parent page ID",
  );
  await assertRejects(
    async () => await createPage.execute({ parentPageId: "a", dataSourceId: "b" }, ctx),
    Error,
    "only one parent",
  );
  assertEquals(calls.length, 0);
});

Deno.test("Internal integration gets actionable parent guidance; OAuth may omit parent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "private" } }]);
  ctx.connection = {
    id: "c",
    app: "io.w6w.notion",
    owner: "u",
    auth: "internal-secret",
    state: "connected",
    createdAt: "2026-10-19",
  };
  await assertRejects(
    async () => await createPage.execute({ title: "Private" }, ctx),
    Error,
    "parent page or data source",
  );
  assertEquals(calls.length, 0);
  ctx.connection.auth = "oauth2";
  await createPage.execute({ title: "Private" }, ctx);
  assertEquals(calls.length, 1);
});

Deno.test("Database ID compatibility resolves one data source before creating a row", async () => {
  const { ctx, calls } = mockCtx([{ body: { data_sources: [{ id: "source" }] } }, {
    body: { id: "row" },
  }]);
  await createRow.execute({ databaseId: "database", properties: { Name: { title: [] } } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/databases/database");
  assertEquals(JSON.parse(calls[1].body!).parent, { data_source_id: "source" });
});

Deno.test("Database queries resolve the container and forward filters and cursors to data source query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data_sources: [{ id: "source" }] } }, {
    body: { results: [], has_more: true, next_cursor: "next" },
  }]);
  await queryRows.execute({
    databaseId: "database",
    filter: { property: "Done", checkbox: { equals: false } },
    startCursor: "cursor",
    filterProperties: ["Name", "Done"],
  }, ctx);
  const url = new URL(calls[1].url);
  assertEquals(url.pathname, "/v1/data_sources/source/query");
  assertEquals(url.searchParams.getAll("filter_properties"), ["Name", "Done"]);
  assertEquals(JSON.parse(calls[1].body!).start_cursor, "cursor");
});

Deno.test("A database with multiple data sources requires an explicit selection", async () => {
  const { ctx, calls } = mockCtx([{ body: { data_sources: [{ id: "one" }, { id: "two" }] } }]);
  await assertRejects(
    async () => await createRow.execute({ databaseId: "database" }, ctx),
    Error,
    "exactly one data source",
  );
  assertEquals(calls.length, 1);
});

Deno.test("Database search resolves and deduplicates data source containers while preserving cursor", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        object: "list",
        results: [{ parent: { database_id: "db" } }, { parent: { database_id: "db" } }],
        has_more: true,
        next_cursor: "next",
      },
    },
    { body: { object: "database", id: "db", data_sources: [{ id: "one" }, { id: "two" }] } },
  ]);
  const result = await listDatabases.execute({}, ctx);
  assertEquals(result.results.length, 1);
  assertEquals(result.next_cursor, "next");
  assertEquals(calls.length, 2);
  assertEquals(JSON.parse(calls[0].body!).filter.value, "data_source");
});

Deno.test("Get Many Databases continues through duplicate-only pages until a unique-database limit", async () => {
  const source = (db: string) => ({ parent: { database_id: db } });
  const { ctx, calls } = mockCtx([
    { body: { results: [source("one")], has_more: true, next_cursor: "c1" } },
    { body: { id: "one" } },
    { body: { results: [source("one")], has_more: true, next_cursor: "c2" } },
    { body: { results: [source("two")], has_more: true, next_cursor: "c3" } },
    { body: { id: "two" } },
  ]);
  assertEquals(await manyDatabases.execute({ limit: 2 }, ctx), {
    results: [{ id: "one" }, { id: "two" }],
  });
  assertEquals(calls.length, 5);
  assertEquals(JSON.parse(calls[3].body!).start_cursor, "c2");
});

Deno.test("Update Page preserves false flags and explicit null icon/cover", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await updatePage.execute({
    pageId: "page",
    inTrash: false,
    isLocked: false,
    icon: null,
    cover: null,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    in_trash: false,
    is_locked: false,
    icon: null,
    cover: null,
  });
});

Deno.test("Property IDs already escaped by Notion are not double encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getProperty.execute({ pageId: "page", propertyId: "a%3Ab%2Fc", startCursor: "next" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages/page/properties/a%3Ab%2Fc");
});

Deno.test("Session streaming preserves event frames and replay IDs in a buffered output", async () => {
  const events = 'id: event-2\nevent: message\ndata: {"text":"hello"}\n\n';
  const { ctx, calls } = mockCtx([{
    body: events,
    headers: { "content-type": "text/event-stream" },
  }]);
  assertEquals(
    await session.execute({
      sessionId: "s",
      continueFrom: "event-1",
      responseFormat: "event_stream",
    }, ctx),
    { eventStream: events },
  );
  assertEquals(calls[0].headers.accept, "text/event-stream");
  assertEquals(JSON.parse(calls[0].body!).continue_from, "event-1");
});

Deno.test("Client preserves rate limit retry information without retrying a mutation", async () => {
  const { ctx, calls } = mockCtx([{
    status: 429,
    headers: { "retry-after": "3" },
    body: { code: "rate_limited" },
  }]);
  const error = await assertRejects(
    () => new NotionClient(ctx).request("/pages", { method: "POST", body: {} }),
    NotionError,
  );
  assertEquals(error.status, 429);
  assertEquals(error.retryAfter, "3");
  assertEquals(calls.length, 1);
});
