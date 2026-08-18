import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  describeError,
  EVENTS_HOSTS,
  eventsHostFor,
  isSecretField,
  json,
  normalizeUrl,
  OnePasswordClient,
  redactFields,
  SECRET_FIELD_TYPES,
  surfaceOf,
} from "../../lib/client.ts";

const connect = { surface: "connect", url: "http://connect:8080" };
const events = { surface: "events", region: "eu" };

Deno.test("eventsHostFor: four regional hosts, and an unknown one is refused", () => {
  assertEquals(eventsHostFor("global"), EVENTS_HOSTS.global);
  assertEquals(eventsHostFor("eu"), EVENTS_HOSTS.eu);
  assertEquals(eventsHostFor("ca"), EVENTS_HOSTS.ca);
  assertEquals(eventsHostFor(undefined), EVENTS_HOSTS.global);
  assertThrows(() => eventsHostFor("apac"), Error, "unknown Events region");
});

Deno.test("normalizeUrl: keeps the port and any path prefix", () => {
  assertEquals(normalizeUrl("connect:8080"), "http://connect:8080");
  assertEquals(normalizeUrl("https://op.example.com/connect/"), "https://op.example.com/connect");
  assertThrows(() => normalizeUrl(""), Error, "required");
});

Deno.test("surfaceOf defaults to connect", () => {
  assertEquals(surfaceOf({ display: connect } as never), "connect");
  assertEquals(surfaceOf({ display: events } as never), "events");
  assertEquals(surfaceOf(undefined), "connect");
});

Deno.test("compact and json behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
});

/**
 * A password field can be typed STRING and still be the password, so `purpose`
 * has to be checked as well as `type`.
 */
Deno.test("isSecretField: concealed types, plus anything with a PASSWORD purpose", () => {
  assert(isSecretField({ type: "CONCEALED" }));
  assert(isSecretField({ type: "OTP" }));
  assert(isSecretField({ type: "SSHKEY" }));
  assert(isSecretField({ type: "CREDIT_CARD_NUMBER" }));
  assert(isSecretField({ type: "STRING", purpose: "PASSWORD" }));
  assert(!isSecretField({ type: "STRING", label: "username" }));
  assert(!isSecretField({ type: "URL" }));
  assertEquals(SECRET_FIELD_TYPES.size, 4);
});

/** The structure is safe and usually what was wanted; the values are not. */
Deno.test("redactFields: keeps the shape and removes the values", () => {
  const redacted = redactFields([
    { id: "a", label: "username", type: "STRING", value: "ada" },
    { id: "b", label: "password", type: "CONCEALED", value: "hunter2" },
    { id: "c", label: "otp", type: "OTP", value: "seed", totp: "123456" },
  ]);
  assertEquals(redacted[0].value, "ada", "a non-secret field is untouched");
  assertEquals(redacted[1].value, "[redacted]");
  assertEquals(redacted[1].label, "password", "the label survives");
  assertEquals(redacted[2].value, "[redacted]");
  assertEquals(redacted[2].totp, undefined, "the generated code goes too");
  assert(!JSON.stringify(redacted).includes("hunter2"), JSON.stringify(redacted));
  assert(!JSON.stringify(redacted).includes("123456"), JSON.stringify(redacted));
});

/** "Is a password set" stays answerable without the value. */
Deno.test("redactFields: an unset secret field stays unset rather than becoming redacted", () => {
  const redacted = redactFields([{ label: "password", type: "CONCEALED" }]);
  assertEquals(redacted[0].value, undefined);
});

/** There is no per-action auth binding, so a mismatch has to be caught here. */
Deno.test("requireConnect: an Events connection is refused, and told which token it needs", () => {
  const { ctx } = mockCtx([], { display: events });
  const error = assertThrows(
    () => new OnePasswordClient(ctx).requireConnect("item-get"),
    Error,
  );
  assert(/needs a \*\*Connect\*\* connection/.test(error.message), error.message);
  assert(/separate credentials reaching separate services/.test(error.message), error.message);
});

Deno.test("requireEvents: a Connect connection is refused the same way", () => {
  const { ctx } = mockCtx([], { display: connect });
  const error = assertThrows(
    () => new OnePasswordClient(ctx).requireEvents("audit-event-list"),
    Error,
  );
  assert(/needs an \*\*Events\*\* connection/.test(error.message), error.message);
});

Deno.test("requireConnect: a connection with no URL says to reconnect", () => {
  const { ctx } = mockCtx([], { display: { surface: "connect" } });
  assertThrows(() => new OnePasswordClient(ctx).requireConnect("x"), Error, "reconnect it");
});

Deno.test("requireEvents: resolves the region to its host", () => {
  const { ctx } = mockCtx([], { display: events });
  assertEquals(new OnePasswordClient(ctx).requireEvents("x"), EVENTS_HOSTS.eu);
});

Deno.test("request: builds the URL and never sets a token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display: connect });
  await new OnePasswordClient(ctx).request("http://connect:8080", "/v1/vaults");
  assertEquals(calls[0].url, "http://connect:8080/v1/vaults");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** A 404 from Connect is often the token's scope rather than a missing item. */
Deno.test("describeError: Connect's 404 names the scope possibility", () => {
  const message = describeError(404, "{}", "connect");
  assert(/not scoped to the vault/.test(message), message);
  assert(/look identical, on purpose/.test(message), message);
});

Deno.test("describeError: a 403 differs by surface", () => {
  assert(/cannot be widened afterwards/.test(describeError(403, "{}", "connect")));
  assert(/granted separately/.test(describeError(403, "{}", "events")));
});

Deno.test("describeError: a 401 names the surface's own cause", () => {
  assert(/issued per Connect server/.test(describeError(401, "{}", "connect")));
  assert(/Check the region/.test(describeError(401, "{}", "events")));
});

Deno.test("describeError: reads both body shapes 1Password uses", () => {
  assert(/nope/.test(describeError(400, JSON.stringify({ message: "nope" }), "connect")));
  assert(
    /Unauthorized/.test(
      describeError(401, JSON.stringify({ Error: { Message: "Unauthorized" } }), "events"),
    ),
  );
});
