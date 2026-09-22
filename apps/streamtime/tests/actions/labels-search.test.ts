import { assertEquals } from "@std/assert";
import labelsSearch from "../../actions/labels-search.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** The vendor's own example is the specification for this body. */
Deno.test("labels-search: POSTs the entity-name mapping verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { Job: [{ id: 1, name: "Urgent" }] } }]);
  const mapping = { Job: [101, 102], Quote: [201], User: [301, 302] };
  const result = await labelsSearch.execute({ entityIdsByType: mapping }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/labels/search");
  assertEquals(bodyOf(calls[0]), mapping);
  assertEquals(result.labels, { Job: [{ id: 1, name: "Urgent" }] });
});

Deno.test("labels-search: a non-object mapping is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await labelsSearch.execute(
      { entityIdsByType: null as unknown as Record<string, number[]> },
      ctx,
    );
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message, "entityIdsByType must be an object mapping entity names to id arrays");
  assertEquals(calls.length, 0);
});
