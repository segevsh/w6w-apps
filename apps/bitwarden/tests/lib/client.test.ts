import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  assertUuid,
  associations,
  BitwardenClient,
  describeError,
  intEnum,
  isoDate,
  list,
  normalizeRegion,
  ORG_TYPE_NAMES,
  regionFromConnection,
} from "../../lib/client.ts";

const UUID = "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b";

Deno.test("client: the region comes from the connection and defaults to US", async () => {
  assertEquals(regionFromConnection(undefined), "us");
  const { ctx, calls } = mockCtx([{ body: {} }], { display: { region: "eu" } });
  await new BitwardenClient(ctx).request("/groups");
  assertEquals(calls[0].url, "https://api.bitwarden.eu/public/groups");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: an empty 200 body is null, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new BitwardenClient(ctx, "us").request("/x", { method: "DELETE" }), null);
});

Deno.test("client: a 400 surfaces the message and per-field errors", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { object: "error", message: "The model state is invalid.", errors: { Email: ["bad"] } },
  }]);
  const err = await assertRejects(() => new BitwardenClient(ctx, "us").request("/members"));
  assert(/400/.test((err as Error).message));
  assert(/Email: bad/.test((err as Error).message), (err as Error).message);
});

Deno.test("client: an empty 404 explains that Bitwarden hides the reason", () => {
  assert(/empty body/.test(describeError(404, "")));
  assert(/region/.test(describeError(401, "")));
});

Deno.test("client: unset query values are dropped, false and 0 are kept", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new BitwardenClient(ctx, "us").request("/events", {
    query: { a: undefined, b: "", c: 0, d: false },
  });
  assertEquals(new URL(calls[0].url).search, "?c=0&d=false");
});

Deno.test("helpers: region, uuid, enums, lists, dates and associations", () => {
  assertEquals(normalizeRegion(" EU "), "eu");
  assertThrows(() => normalizeRegion("gov"));
  assertEquals(assertUuid(UUID.toUpperCase(), "x"), UUID);
  assertThrows(() => assertUuid("", "x"), Error, "required");
  assertEquals(intEnum("4", "type", ORG_TYPE_NAMES), 4);
  assertThrows(() => intEnum(3, "type", ORG_TYPE_NAMES));
  assertEquals(list("a, b\nc"), ["a", "b", "c"]);
  assertEquals(list([]), undefined);
  assertEquals(isoDate("2026-10-01", "start"), "2026-10-01T00:00:00.000Z");
  assertThrows(() => isoDate("tomorrow", "start"), Error, "ISO 8601");
  assertEquals(associations([{ id: UUID, manage: true }], "g"), [
    { id: UUID, readOnly: false, manage: true },
  ]);
  assertThrows(() => associations('{"id":1}', "g"), Error, "array");
});
