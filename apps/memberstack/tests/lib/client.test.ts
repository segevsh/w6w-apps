import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  formatMemberstackError,
  isInvalidKey,
  MemberstackClient,
} from "../../lib/client.ts";
import { asObject, asObjectOrArray } from "../../lib/params.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("formatMemberstackError: shows message, hides generic-message, keeps specific codes", () => {
  const g = formatMemberstackError(400, "GET", "/x", JSON.stringify(errorBody("boom")));
  assertEquals(g, "Memberstack 400 for GET /x — boom");
  const s = formatMemberstackError(
    400,
    "POST",
    "/members",
    JSON.stringify(errorBody("bad", "plan-not-found")),
  );
  assert(s.endsWith("— bad (plan-not-found)"));
  assertEquals(
    formatMemberstackError(502, "GET", "/x", "<html>"),
    "Memberstack 502 for GET /x: <html>",
  );
});

Deno.test("isInvalidKey reads the body code only", () => {
  assert(isInvalidKey({ code: "validation/invalid-secret-key" }));
  assert(!isInvalidKey({ code: "generic-message" }));
  assert(!isInvalidKey(null));
});

Deno.test("client: sends no credential header itself, and raises MemberstackError with status", async () => {
  const { ctx, calls } = mockCtx([{ status: 429, body: errorBody("Too many requests") }]);
  const err = await assertRejects(() => new MemberstackClient(ctx).json("/members"), Error, "429");
  assertEquals((err as { status?: number }).status, 429);
  assertEquals(Object.keys(calls[0].headers), ["accept"]);
});

Deno.test("compact keeps false and 0, drops unset", () => {
  assertEquals(compact({ a: false, b: 0, c: "", d: null, e: undefined, f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
});

Deno.test("asObject / asObjectOrArray", () => {
  assertEquals(asObject(undefined, "x"), undefined);
  assertEquals(asObject("", "x"), undefined);
  assertEquals(asObject('{"a":1}', "x"), { a: 1 });
  for (const bad of ["[1]", "3", "{nope", [1]]) {
    assert(
      (() => {
        try {
          asObject(bad, "x");
          return false;
        } catch {
          return true;
        }
      })(),
      String(bad),
    );
  }
  assertEquals(asObjectOrArray("[1]", "x"), [1]);
});
