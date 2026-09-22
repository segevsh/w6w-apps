import { assertEquals } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-list-ids.ts";

Deno.test("collection-list-ids: POSTs to the documents root for top-level collections", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { collectionIds: ["users", "cities"], nextPageToken: "tok-2" },
  }], { display: DISPLAY });

  const result = await action.execute({}, ctx) as {
    collectionIds: string[];
    count: number;
    nextPageToken?: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents:listCollectionIds",
  );
  assertEquals(result.collectionIds, ["users", "cities"]);
  assertEquals(result.count, 2);
  assertEquals(result.nextPageToken, "tok-2");
});

Deno.test("collection-list-ids: a parentPath lists that document's subcollections", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { collectionIds: ["orders"] } }], {
    display: DISPLAY,
  });
  const result = await action.execute({ parentPath: "users/alice" }, ctx) as {
    collectionIds: string[];
  };
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice:listCollectionIds",
  );
  assertEquals(result.collectionIds, ["orders"]);
});

Deno.test("collection-list-ids: paging params go in the body, not the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });
  await action.execute({ pageSize: 10, pageToken: "tok-2" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.parse(calls[0].body!), { pageSize: 10, pageToken: "tok-2" });
});
