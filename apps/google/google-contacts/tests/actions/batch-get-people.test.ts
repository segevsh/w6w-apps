import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-get-people.ts";

Deno.test("batch-get-people: resourceNames is a REPEATED param, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: { responses: [] } }]);
  await action.execute({ resourceNames: "people/c1, people/c2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/people:batchGet");
  assertEquals(url.searchParams.getAll("resourceNames"), ["people/c1", "people/c2"]);
  assertEquals(url.searchParams.get("personFields"), "names,emailAddresses,phoneNumbers");
});

Deno.test("batch-get-people: prefixes bare ids and accepts newline separation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ resourceNames: "c1\nc2\npeople/c3" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("resourceNames"), [
    "people/c1",
    "people/c2",
    "people/c3",
  ]);
});

Deno.test("batch-get-people: rejects an empty list before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ resourceNames: "" }, ctx),
    Error,
    "`resourceNames` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("batch-get-people: enforces Google's 200-name ceiling locally", () => {
  const { ctx, calls } = mockCtx([]);
  const tooMany = Array.from({ length: 201 }, (_, i) => `c${i}`);
  assertThrows(
    () => action.execute({ resourceNames: tooMany }, ctx),
    Error,
    "at most 200 resource names",
  );
  assertEquals(calls.length, 0);
});

Deno.test("batch-get-people: exactly 200 names is allowed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const names = Array.from({ length: 200 }, (_, i) => `c${i}`);
  await action.execute({ resourceNames: names }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("resourceNames").length, 200);
});
