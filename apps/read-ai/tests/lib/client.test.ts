import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  formatReadAiError,
  pickExpand,
  ReadAiClient,
  timeFilters,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: arrays use the documented literal expand[] form", () => {
  assertEquals(
    buildQuery({ limit: 5, expand: ["summary", "metrics"], cursor: undefined }),
    "?limit=5&expand[]=summary&expand[]=metrics",
  );
  assertEquals(buildQuery({}), "");
  assertEquals(buildQuery({ "start_time_ms.gte": 0 }), "?start_time_ms.gte=0");
});

Deno.test("pickExpand: drops values the API does not document", () => {
  assertEquals(pickExpand(["summary", "bogus"], ["summary", "metrics"]), ["summary"]);
  assertEquals(pickExpand(undefined, ["summary"]), []);
});

Deno.test("timeFilters: maps camel params to dotted vendor names, rejects non-numbers", () => {
  assertEquals(timeFilters({ startTimeMsGte: 5, startTimeMsLt: "9" }), {
    "start_time_ms.gte": 5,
    "start_time_ms.lt": 9,
  });
  assertEquals(timeFilters({ startTimeMsGt: 1, startTimeMsLt: 2 }, ["startTimeMsGt"]), {
    "start_time_ms.gt": 1,
  });
  try {
    timeFilters({ startTimeMsGt: "abc" });
    throw new Error("expected throw");
  } catch (e) {
    assertEquals((e as Error).message.includes("startTimeMsGt"), true);
  }
});

Deno.test("formatReadAiError: reads both 401 shapes", async () => {
  assertEquals(
    await formatReadAiError(new Response('{"detail":"Not authenticated"}', { status: 401 })),
    "Read AI 401: Not authenticated",
  );
  const obj = await formatReadAiError(
    new Response(
      '{"detail":{"error":"invalid_token","error_description":"bad","hint":"h"}}',
      { status: 401 },
    ),
  );
  assertEquals(obj, "Read AI 401 invalid_token: bad (h)");
  assertEquals(await formatReadAiError(new Response("oops", { status: 500 })), "Read AI 500");
});

Deno.test("ReadAiClient: sends no credential and throws the vendor error", async () => {
  const { ctx, calls } = mockCtx([{ status: 404, body: { detail: "Not Found" } }]);
  await assertRejects(() => new ReadAiClient(ctx).get("/v1/meetings/x"), Error, "Read AI 404");
  assertEquals(calls[0].headers.authorization, undefined);
});
