import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, compact, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import {
  BACKGROUND_PARAM,
  helperBody,
  PERSON_PARAMS,
  recordOutput,
  REFERRER_PARAMS,
  TAG_OP_PARAMS,
} from "../lib/person.ts";

/**
 * Record Outreach Helper: `POST /advocacy_campaigns/{id}/outreaches`. The vendor requires
 * `targets` to be an array of exactly one, so a single target is taken here.
 */
const outreachRecord: ActionDefinition<Input> = {
  key: "outreach-record",
  type: "perform",
  resource: "outreach",
  title: "Record Outreach",
  description:
    "Record that a person wrote or called a target on an advocacy campaign, creating or updating the person in the same call. Takes one target.",
  idempotent: false,
  params: [
    idParam("advocacyCampaignId", "Advocacy campaign ID"),
    { key: "targetTitle", label: "Target title", type: "string", hint: 'e.g. "Senator".' },
    { key: "targetGivenName", label: "Target first name", type: "string" },
    { key: "targetFamilyName", label: "Target last name", type: "string" },
    {
      key: "targetOcdid",
      label: "Target OCD division ID",
      type: "string",
      hint: "e.g. ocd-division/country:us/state:ny/cd:18.",
    },
    { key: "subject", label: "Subject", type: "string", hint: "Email campaigns only." },
    { key: "message", label: "Message", type: "text", hint: "Email campaigns only." },
    { key: "duration", label: "Call length", type: "number", hint: "Phone campaigns only." },
    ...PERSON_PARAMS,
    ...TAG_OP_PARAMS,
    ...REFERRER_PARAMS,
    BACKGROUND_PARAM,
  ],
  output: recordOutput(
    { key: "type", type: "string", label: "email or phone" },
    { key: "targets", type: "array", label: "Targets: { title, given_name, family_name, ocdid }" },
  ),

  execute(input, ctx) {
    const target = compact({
      title: input.targetTitle,
      given_name: input.targetGivenName,
      family_name: input.targetFamilyName,
      ocdid: input.targetOcdid,
    });
    const extra = compact({
      subject: input.subject,
      message: input.message,
      duration: input.duration,
      targets: Object.keys(target).length > 0 ? [target] : undefined,
    });
    return new ActionNetworkClient(ctx).create(
      `/advocacy_campaigns/${seg(need(input, "advocacyCampaignId"))}/outreaches`,
      helperBody(input, extra),
      input.backgroundRequest === true,
    );
  },
};

export default outreachRecord;
