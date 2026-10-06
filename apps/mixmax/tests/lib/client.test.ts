import { assertEquals, assertRejects } from "@std/assert";
import {
  buildQuery,
  compact,
  MixmaxClient,
  page,
  recipients,
  scheduledAt,
  sequenceRecipients,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: query building skips empties and repeats arrays", () => {
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: ["x", "y"] }), "?a=1&d=x&d=y");
  assertEquals(buildQuery({}), "");
});

Deno.test("client: list and recipient helpers", () => {
  assertEquals(strList(" a, b ,,"), ["a", "b"]);
  assertEquals(recipients("a@x.com"), [{ email: "a@x.com" }]);
  assertEquals(compact({ a: undefined }), undefined);
  assertEquals(page({ results: [1], next: "n", hasNext: true }), {
    results: [1],
    next: "n",
    hasNext: true,
  });
  assertEquals(page(null), { results: [], next: undefined, hasNext: false });
  assertEquals(sequenceRecipients('[{"email":"a@x.com","variables":{"first":"A"}}]'), [
    { email: "a@x.com", variables: { email: "a@x.com", first: "A" } },
  ]);
  assertEquals(scheduledAt("false"), false);
  assertEquals(scheduledAt("1700000000000"), 1700000000000);
  assertEquals(scheduledAt(""), undefined);
});

Deno.test("client: errors carry status and Mixmax's message; 204 is {}", async () => {
  const bad = mockCtx([{ status: 400, body: { message: "Missing parameter" } }]);
  await assertRejects(
    () => new MixmaxClient(bad.ctx).request("GET", "/x"),
    Error,
    "HTTP 400 — Missing parameter",
  );
  const limited = mockCtx([{ status: 429, body: { message: "slow down" } }]);
  await assertRejects(
    () => new MixmaxClient(limited.ctx).request("GET", "/x"),
    Error,
    "120 requests per 60 seconds",
  );
  const empty = mockCtx([{ status: 204 }]);
  assertEquals(await new MixmaxClient(empty.ctx).request("DELETE", "/x"), {});
});
