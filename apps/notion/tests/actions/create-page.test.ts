import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-page.ts";

Deno.test("create-page: POSTs /pages under a parent page with a title property", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "page-child" } }]);
  await action.execute({ parentPageId: "parent-1", title: "Welcome" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/pages");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.parent, { page_id: "parent-1" });
  assertEquals(sent.properties.title.title[0].text.content, "Welcome");
});

Deno.test("create-page: a data source row's Title fills the data source's own title column", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        object: "data_source",
        properties: { Status: { type: "status" }, Task: { type: "title" } },
      },
    },
    { body: { object: "page", id: "row" } },
  ]);
  await action.execute({
    parentType: "data_source",
    dataSourceId: "ds-1",
    title: "Ship it",
    properties: { Status: { status: { name: "Open" } } },
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/data_sources/ds-1");
  const sent = JSON.parse(calls[1].body ?? "{}");
  assertEquals(sent.parent, { data_source_id: "ds-1" });
  assertEquals(sent.properties, {
    Status: { status: { name: "Open" } },
    Task: { title: [{ text: { content: "Ship it" } }] },
  });
});

Deno.test("create-page: an empty Title is no title — a data source row is created from Properties alone", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "page", id: "row" } }]);
  await action.execute({
    parentType: "data_source",
    dataSourceId: "ds-1",
    title: "  ",
    properties: { Name: { title: [{ text: { content: "From properties" } }] } },
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(calls[0].body ?? "{}").properties, {
    Name: { title: [{ text: { content: "From properties" } }] },
  });
});

Deno.test("create-page: Title and the title column in Properties together are refused", async () => {
  const { ctx } = mockCtx([{ body: { properties: { Name: { type: "title" } } } }]);
  await assertRejects(
    async () =>
      await action.execute({
        dataSourceId: "ds-1",
        title: "A",
        properties: { Name: { title: [] } },
      }, ctx),
    Error,
    "properties.Name",
  );
});

Deno.test("create-page: a custom database_id parent resolves its sole data source for the title column", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data_sources: [{ id: "ds-9" }] } },
    { body: { properties: { Name: { type: "title" } } } },
    { body: { object: "page", id: "row" } },
  ]);
  await action.execute(
    { parentType: "custom", parent: { database_id: "db-1" }, title: "Row" },
    ctx,
  );
  assertEquals(new URL(calls[1].url).pathname, "/v1/data_sources/ds-9");
  const sent = JSON.parse(calls[2].body ?? "{}");
  assertEquals(sent.parent, { database_id: "db-1" });
  assertEquals(sent.properties, { Name: { title: [{ text: { content: "Row" } }] } });
});
