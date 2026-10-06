import { assert, assertEquals, assertRejects } from "@std/assert";
import listFiles from "../../actions/list-files.ts";
import { errBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const sample = {
  "type": "MMS",
  "limit": 3,
};
const run = (
  ctx: Parameters<typeof listFiles.execute>[1],
  input: Record<string, unknown> = sample,
) => listFiles.execute(input as never, ctx) as Promise<unknown>;

Deno.test("list-files: declares a read action with a description, params and output", () => {
  assertEquals(listFiles.key, "list-files");
  assertEquals(listFiles.type, "read");
  assert((listFiles.description ?? "").length > 0);
  assert(Array.isArray(listFiles.output) && listFiles.output.length > 0);
  assertEquals(listFiles.idempotent, undefined);
});

Deno.test("list-files: sends the documented request and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "fileList": [
        {
          "fileId": "F1",
          "name": "a.jpg",
        },
      ],
      "nextKey": "F9",
    },
  }]);
  const out = await run(ctx);
  assertEquals(out, {
    "items": [
      {
        "fileId": "F1",
        "name": "a.jpg",
      },
    ],
    "count": 1,
    "nextKey": "F9",
    "limit": null,
  });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/storage/v1/files");
  assertEquals(calls[0].url.startsWith("https://api.solapi.com/"), true);
  assertEquals(queryOf(calls[0].url), {
    "type": "MMS",
    "limit": "3",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("list-files: a SOLAPI error body is thrown with its code and message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errBody("Unauthorized", "no permission") }]);
  await assertRejects(() => run(ctx), Error, "SOLAPI 401: Unauthorized: no permission");
});
