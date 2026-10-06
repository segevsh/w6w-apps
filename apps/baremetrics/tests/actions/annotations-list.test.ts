import { assert, assertEquals } from "@std/assert";
import annotationsList from "../../actions/annotations-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("annotations-list: GET /v1/annotations with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { annotations: [] } }]);
  const out = await annotationsList.execute({ per_page: 5, page: 5 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/annotations");
  assertEquals(queryOf(calls[0].url), { per_page: "5", page: "5" });

  const bare = mockCtx([{ body: {} }]);
  await annotationsList.execute({}, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("annotations" in out);
});

Deno.test("annotations-list: declares type search and every required param", () => {
  assertEquals(annotationsList.type, "search");
  const required = (annotationsList.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, []);
});

Deno.test("annotations-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await annotationsList.execute({ per_page: 5, page: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
