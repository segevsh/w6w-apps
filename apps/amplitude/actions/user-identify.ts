import type { ActionDefinition } from "@w6w/types";
import { AmplitudeClient, json, MIN_ID_LENGTH } from "../lib/client.ts";

/**
 * `POST /identify` — set properties on a user without sending an event.
 *
 * ## The one form-encoded endpoint
 *
 * Everything else in Amplitude's ingest API is JSON. This one takes
 * `application/x-www-form-urlencoded` with the payload as a JSON *string* in an
 * `identification` parameter, and answers a bad key with the plain text
 * `invalid_api_key` — no JSON at all. Verified live 2026-08-18.
 *
 * ## Property operations, and the one that surprises people
 *
 * The payload's `user_properties` can be a plain object, which **sets** the
 * properties — or a map of operations:
 *
 * - `$set` — overwrite.
 * - `$setOnce` — set only if never set before. This is how a signup date stays
 *   the *first* one, and using `$set` for it silently rewrites history on every
 *   call.
 * - `$add` — increment a numeric property.
 * - `$append` / `$prepend` — add to a list.
 * - `$unset` — remove.
 *
 * A plain object is `$set`, which is right for most things and wrong for
 * exactly the properties people care most about keeping.
 *
 * ## Identify is not free
 *
 * Each identify counts against the project's event volume even though no event
 * appears in any chart. Setting a property on every user nightly is a real
 * cost, and it is invisible in the UI.
 */
const action: ActionDefinition = {
  key: "user-identify",
  type: "perform",
  resource: "user",
  title: "Set user properties",
  description:
    "Set properties on a user without sending an event. Use `$setOnce` for anything that should " +
    "keep its first value — a plain object is `$set` and rewrites it every time.",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      default: "",
      hint: `At least ${MIN_ID_LENGTH} characters — Amplitude drops shorter ids silently. Give ` +
        "this or a device id.",
    },
    {
      key: "deviceId",
      label: "Device ID",
      type: "string",
      default: "",
    },
    {
      key: "userProperties",
      label: "User Properties",
      type: "json",
      required: true,
      default: "",
      hint: 'A plain object sets them, e.g. {"plan":"pro"}. For operations, use the map form: ' +
        '{"$setOnce":{"signup_date":"2026-01-01"},"$add":{"logins":1}}.',
    },
    {
      key: "groups",
      label: "Groups",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. {"company":"Acme"}. Associates the user with a group for account-level analysis.',
    },
  ],
  output: [
    { key: "identified", type: "boolean", label: "Accepted" },
    { key: "userId", type: "string", label: "The user set" },
    { key: "operations", type: "array", label: "Which property operations were used" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    const deviceId = String(p.deviceId ?? "").trim();
    if (!userId && !deviceId) throw new Error("give a `userId` or a `deviceId`");

    for (const [field, value] of [["userId", userId], ["deviceId", deviceId]]) {
      if (value && value.length < MIN_ID_LENGTH) {
        throw new Error(
          `\`${field}\` is ${value.length} characters and Amplitude's minimum is ` +
            `${MIN_ID_LENGTH}. It does not reject short ids — it removes them, so this would ` +
            "identify nobody",
        );
      }
    }

    const userProperties = json(p.userProperties, "userProperties") as
      | Record<string, unknown>
      | undefined;
    if (!userProperties || Object.keys(userProperties).length === 0) {
      throw new Error("`userProperties` is required — give at least one property to set");
    }

    const identification = {
      user_id: userId || undefined,
      device_id: deviceId || undefined,
      user_properties: userProperties,
      groups: json(p.groups, "groups"),
    };

    await new AmplitudeClient(ctx).ingest({
      path: "/identify",
      // The only form-encoded endpoint in the API, with JSON inside a field.
      form: true,
      body: { identification: JSON.stringify([identification]) },
    });

    // Which operations were used, because $set vs $setOnce is the distinction
    // that matters and is invisible afterwards.
    const operations = Object.keys(userProperties).filter((key) => key.startsWith("$"));

    ctx.log("info", "set Amplitude user properties", {
      propertyCount: Object.keys(userProperties).length,
      operations,
    });

    return { identified: true, userId: userId || deviceId, operations };
  },
};

export default action;
