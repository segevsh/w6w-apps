import { assertEquals } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/document-list.ts";

const PAGE = {
  documents: [
    {
      name: "projects/p1/databases/(default)/documents/users/alice",
      fields: { name: { stringValue: "Ada" } },
    },
    {
      name: "projects/p1/databases/(default)/documents/users/bob",
      fields: { name: { stringValue: "Bob" }, age: { integerValue: "41" } },
    },
  ],
  nextPageToken: "tok-2",
};

Deno.test("document-list: GETs parent + collectionId and returns one page with its token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: PAGE }], { display: DISPLAY });

  const result = await action.execute({ collectionPath: "users", pageSize: 2 }, ctx) as {
    documents: Array<{ data?: unknown }>;
    count: number;
    nextPageToken?: string;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("pageSize"), "2");
  assertEquals(result.count, 2);
  assertEquals(result.nextPageToken, "tok-2");
  assertEquals(result.documents[0].data, { name: "Ada" });
  assertEquals(result.documents[1].data, { name: "Bob", age: 41 });
});

Deno.test("document-list: orderBy/showMissing/readTime/mask reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { documents: [] } }], { display: DISPLAY });
  await action.execute({
    collectionPath: "users/alice/orders",
    pageToken: "tok-2",
    orderBy: "priority desc",
    showMissing: true,
    mask: "pid, weight",
    readTime: "2026-09-22T00:00:00Z",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice/orders",
  );
  assertEquals(url.searchParams.get("orderBy"), "priority desc");
  assertEquals(url.searchParams.get("showMissing"), "true");
  assertEquals(url.searchParams.getAll("mask.fieldPaths"), ["pid", "weight"]);
  assertEquals(url.searchParams.get("readTime"), "2026-09-22T00:00:00Z");
  assertEquals(url.searchParams.get("pageToken"), "tok-2");
});

Deno.test("document-list: an absent nextPageToken stays absent, and showMissing is omitted by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { documents: [] } }], { display: DISPLAY });
  const result = await action.execute({ collectionPath: "users" }, ctx) as {
    nextPageToken?: string;
  };
  assertEquals(result.nextPageToken, undefined);
  assertEquals(new URL(calls[0].url).searchParams.has("showMissing"), false);
});
