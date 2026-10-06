import { assert, assertEquals } from "@std/assert";
import mediaList from "../../actions/media-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("media-list: calls GET /modern/medias with the version header", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ "id": 1, "cursor": "cur1" }, { "id": 2, "cursor": "cur2" }],
  }]);
  const out = await mediaList.execute(
    {
      "folderId": "f1",
      "name": "Intro",
      "type": "Video",
      "tags": "a, b",
      "hashedIds": "x1,x2",
      "archived": false,
      "includeSpeakers": true,
      "perPage": 10,
      "page": 2,
      "sortBy": "name",
      "sortDirection": "0",
    } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).origin, "https://api.wistia.com");
  assertEquals(pathOf(calls[0].url), "/modern/medias");
  assertEquals(queryOf(calls[0].url), {
    "folder_id": "f1",
    "name": "Intro",
    "type": "Video",
    "archived": "false",
    "include": "speakers",
    "per_page": "10",
    "page": "2",
    "sort_by": "name",
    "sort_direction": "0",
    "tags[]": "b",
    "hashed_ids[]": "x2",
  });
  assertEquals(calls[0].headers["x-wistia-api-version"], "2026-09");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].body, null);
  assertEquals(out.count, 2);
  assertEquals(out.nextCursor, "cur2");
  assertEquals((out.items as unknown[]).length, 2);
});

Deno.test("media-list: surfaces a Wistia error with its code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized_scope", error: "Token lacks scope." },
  }]);
  let message = "";
  try {
    await mediaList.execute(
      {
        "folderId": "f1",
        "name": "Intro",
        "type": "Video",
        "tags": "a, b",
        "hashedIds": "x1,x2",
        "archived": false,
        "includeSpeakers": true,
        "perPage": 10,
        "page": 2,
        "sortBy": "name",
        "sortDirection": "0",
      } as never,
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("Wistia 401 unauthorized_scope"), message);
  assert(message.includes("Token lacks scope."), message);
});

Deno.test("media-list: array filters repeat the bracketed key", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await mediaList.execute({ tags: ["a", "b"], hashedIds: "x1, x2" } as never, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.getAll("tags[]"), ["a", "b"]);
  assertEquals(params.getAll("hashed_ids[]"), ["x1", "x2"]);
});

Deno.test("media-list: an unset archived flag is not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await mediaList.execute({} as never, ctx) as { count: number; nextCursor: null };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.count, 0);
  assertEquals(out.nextCursor, null);
});
