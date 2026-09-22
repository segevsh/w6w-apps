import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
} from "../lib/client.ts";

/**
 * `GET /consultant/services` — the practice's bookable service types.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`), plus the one extra filter the
 * document gives this operation.
 *
 * This is where `create-session`'s `serviceId` comes from: a service carries the
 * kind of appointment a client can book, and the session's `duration` and
 * `serviceType` are chosen against it.
 */
interface Input extends PageInput {
  team_for?: string;
}

const listServices: ActionDefinition<Input, Page<unknown>> = {
  key: "list-services",
  type: "search",
  resource: "service",
  title: "List Services",
  description:
    "List the practice's bookable services — the ids `create-session` takes as `serviceId`.",
  params: [
    ...pageParams,
    {
      key: "team_for",
      label: "Team for",
      type: "string",
      hint: "Scope the list to the services of this team recipient.",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/services", {
      query: { ...pageQuery(input), team_for: input.team_for },
    });
  },
};

export default listServices;
