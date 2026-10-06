import type { ActionDefinition } from "@w6w/types";
import { DubClient } from "../lib/client.ts";
import {
  LINK_FIELD_PARAMS,
  LINK_OUTPUT,
  linkBody,
  type LinkFields,
  urlParam,
} from "../lib/links.ts";

type Input = LinkFields & { url: string };

/** `PUT /links/upsert` — create the link, or update the one that already has this URL. */
const linkUpsert: ActionDefinition<Input> = {
  key: "link-upsert",
  type: "perform",
  resource: "link",
  title: "Upsert Link",
  description:
    "Create a short link, or update the existing one if a link with the same destination URL already exists in the workspace. Safe to repeat.",
  idempotent: true,
  params: [urlParam(true), ...LINK_FIELD_PARAMS],
  output: LINK_OUTPUT,

  execute(input, ctx) {
    return new DubClient(ctx).request("PUT", "/links/upsert", { body: linkBody(input) });
  },
};

export default linkUpsert;
