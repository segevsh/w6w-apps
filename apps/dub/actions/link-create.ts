import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";
import {
  LINK_FIELD_PARAMS,
  LINK_OUTPUT,
  linkBody,
  type LinkFields,
  urlParam,
} from "../lib/links.ts";

type Input = LinkFields & { url: string; keyLength?: number; prefix?: string };

/** `POST /links` — create a short link. */
const linkCreate: ActionDefinition<Input> = {
  key: "link-create",
  type: "perform",
  resource: "link",
  title: "Create Link",
  description:
    "Create a short link. Leave the slug empty for a random one (7 characters unless `keyLength` says otherwise).",
  idempotent: false,
  params: [
    urlParam(true),
    ...LINK_FIELD_PARAMS,
    {
      key: "keyLength",
      label: "Slug length",
      type: "number",
      hint: "Length of a generated slug. Ignored when a slug is given.",
      validation: { min: 3, max: 190, integer: true },
      advanced: true,
    },
    {
      key: "prefix",
      label: "Slug prefix",
      type: "string",
      hint: "Prefix for a generated slug, e.g. `/c/`. Ignored when a slug is given.",
      advanced: true,
    },
  ],
  output: LINK_OUTPUT,

  execute(input, ctx) {
    const body = {
      ...linkBody(input),
      ...(input.keyLength !== undefined ? { keyLength: input.keyLength } : {}),
      ...(input.prefix !== undefined && input.prefix !== "" ? { prefix: input.prefix } : {}),
    };
    return new DubClient(ctx).request("POST", "/links", { body });
  },
};

export default linkCreate;
