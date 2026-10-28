import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/text-replace-all.ts";

Deno.test("text-replace-all: builds replaceAllText with the match criteria", async () => {
  const { ctx, calls } = mockCtx([
    { body: { presentationId: "p1", replies: [{ replaceAllText: { occurrencesChanged: 4 } }] } },
  ]);
  const out = await action.execute(
    { presentationId: "p1", text: "{{name}}", replaceText: "Ada" },
    ctx,
  ) as { occurrencesChanged: number };

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      replaceAllText: {
        replaceText: "Ada",
        containsText: { text: "{{name}}", matchCase: false },
      },
    }],
  });
  assertEquals(out.occurrencesChanged, 4);
});

Deno.test("text-replace-all: matchCase and searchByRegex reach containsText", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ replaceAllText: {} }] } }]);
  await action.execute({
    presentationId: "p1",
    text: "Q[0-9]",
    replaceText: "Q4",
    matchCase: true,
    searchByRegex: true,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).requests[0].replaceAllText.containsText, {
    text: "Q[0-9]",
    matchCase: true,
    searchByRegex: true,
  });
});

Deno.test("text-replace-all: pageObjectIds narrows the sweep, and an empty list is omitted", async () => {
  const { ctx, calls } = mockCtx([
    { body: { replies: [{ replaceAllText: {} }] } },
    { body: { replies: [{ replaceAllText: {} }] } },
  ]);
  await action.execute(
    { presentationId: "p1", text: "a", replaceText: "b", pageObjectIds: ["g1", "g2"] },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).requests[0].replaceAllText.pageObjectIds,
    ["g1", "g2"],
  );

  await action.execute(
    { presentationId: "p1", text: "a", replaceText: "b", pageObjectIds: [] },
    ctx,
  );
  assertEquals(
    "pageObjectIds" in JSON.parse(calls[1].body!).requests[0].replaceAllText,
    false,
  );
});

Deno.test("text-replace-all: an unmatched run is a 200 with an EMPTY reply, normalised to 0", async () => {
  // Protobuf JSON omits int32 fields at their default, so "changed nothing"
  // arrives as `{}` rather than `{ occurrencesChanged: 0 }`.
  const { ctx } = mockCtx([{ body: { presentationId: "p1", replies: [{ replaceAllText: {} }] } }]);
  const out = await action.execute(
    { presentationId: "p1", text: "nope", replaceText: "x" },
    ctx,
  ) as { occurrencesChanged: number };
  assertEquals(out.occurrencesChanged, 0);
});

Deno.test("text-replace-all: a wholly empty replies array still normalises to 0", async () => {
  const { ctx } = mockCtx([{ body: { presentationId: "p1", replies: [] } }]);
  const out = await action.execute(
    { presentationId: "p1", text: "nope", replaceText: "x" },
    ctx,
  ) as { occurrencesChanged: number };
  assertEquals(out.occurrencesChanged, 0);
});

Deno.test("text-replace-all: failIfNoMatch turns the silent 200 into an error", async () => {
  const { ctx } = mockCtx([{ body: { replies: [{ replaceAllText: {} }] } }]);
  await assertRejects(
    async () => {
      await action.execute(
        { presentationId: "p1", text: "nope", replaceText: "x", failIfNoMatch: true },
        ctx,
      );
    },
    Error,
    "matched nothing",
  );
});

Deno.test("text-replace-all: failIfNoMatch stays quiet when something matched", async () => {
  const { ctx } = mockCtx([{ body: { replies: [{ replaceAllText: { occurrencesChanged: 1 } }] } }]);
  const out = await action.execute(
    { presentationId: "p1", text: "a", replaceText: "b", failIfNoMatch: true },
    ctx,
  ) as { occurrencesChanged: number };
  assertEquals(out.occurrencesChanged, 1);
});

Deno.test("text-replace-all: failIfNoMatch defaults off", () => {
  const param = (action.params ?? []).find((p) => p.key === "failIfNoMatch");
  assertEquals(param?.default, false);
});
