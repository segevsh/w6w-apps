import { assert, assertEquals } from "@std/assert";
import { optionValues } from "../_helpers.ts";
import {
  channelIdParam,
  chatIdParam,
  continuationParams,
  messageBodyParams,
  pagedOutput,
  pagingParams,
  teamIdParam,
} from "../../lib/params.ts";

Deno.test("params: the three id params are required strings", () => {
  for (const p of [teamIdParam, channelIdParam, chatIdParam]) {
    assertEquals(p.type, "string");
    assertEquals(p.required, true);
    assert(p.hint, `${p.key} has no hint`);
  }
});

Deno.test("params: pagingParams caps $top at the endpoint's documented maximum", () => {
  const messages = pagingParams({ defaultTop: 20, maxTop: 50 });
  const top = messages.find((p) => p.key === "top")!;
  assertEquals(top.default, 20);
  assertEquals(top.validation?.max, 50);

  // The member collections allow far larger pages than the message ones.
  const members = pagingParams({ defaultTop: 100, maxTop: 999 });
  assertEquals(members.find((p) => p.key === "top")!.validation?.max, 999);
});

Deno.test("params: pagingParams is continuationParams plus a page size", () => {
  assertEquals(
    pagingParams().map((p) => p.key),
    ["top", ...continuationParams().map((p) => p.key)],
  );
});

Deno.test("params: continuationParams offers no $skip — Teams collections are cursor-only", () => {
  const keys = continuationParams().map((p) => p.key);
  assertEquals(keys, ["nextLink", "all", "maxPages"]);
  assertEquals(keys.includes("skip"), false);
});

Deno.test("params: pagingParams returns a fresh array each call", () => {
  const a = pagingParams();
  const b = pagingParams();
  assert(a !== b);
  assert(a[0] !== b[0] || a.length === b.length);
});

Deno.test("params: messageBodyParams defaults to html and offers the importance enum", () => {
  const params = messageBodyParams();
  assertEquals(params.map((p) => p.key), ["content", "contentType", "importance"]);
  assertEquals(params[0].required, true);
  assertEquals(params[1].default, "html");
  assertEquals(optionValues(params[2].options), ["normal", "high", "urgent"]);
});

Deno.test("params: pagedOutput describes the paged envelope", () => {
  assertEquals(pagedOutput("Teams").map((o) => o.key), ["value", "nextLink", "pages"]);
});
