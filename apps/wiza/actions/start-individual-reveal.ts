import type { ActionDefinition } from "@w6w/types";
import { compact, dataOf, WizaClient } from "../lib/client.ts";

interface Input {
  profileUrl?: string;
  email?: string;
  fullName?: string;
  company?: string;
  domain?: string;
  enrichmentLevel: "none" | "partial" | "phone" | "full";
  acceptWork?: boolean;
  acceptPersonal?: boolean;
  callbackUrl?: string;
  fairKey?: string;
}

const startIndividualReveal: ActionDefinition<Input> = {
  key: "start-individual-reveal",
  type: "perform",
  resource: "individual-reveal",
  title: "Start Individual Reveal",
  description:
    "Start a single-contact enrichment (POST /api/individual_reveals) from a LinkedIn profile URL, an email, or a full name plus a company or domain. It is asynchronous: this returns an id and status immediately; read the result with Get Individual Reveal or let the webhook deliver it. Credits are charged only when data comes back (1 profile, 2 email, 5 phone).",
  idempotent: false,
  params: [
    {
      key: "profileUrl",
      label: "LinkedIn profile URL",
      type: "string",
      hint: "Matches on its own. Linkedin, Sales Navigator or Recruiter URLs.",
      placeholder: "https://www.linkedin.com/in/stephen-hakami-5babb21b0/",
    },
    { key: "email", label: "Email", type: "string", hint: "Matches on its own." },
    {
      key: "fullName",
      label: "Full name",
      type: "string",
      hint: "Needs a company or a domain.",
      placeholder: "Stephen Hakami",
    },
    { key: "company", label: "Company name", type: "string", placeholder: "Wiza" },
    { key: "domain", label: "Company domain", type: "string", placeholder: "wiza.co" },
    {
      key: "enrichmentLevel",
      label: "Enrichment level",
      type: "select",
      required: true,
      default: "partial",
      options: [
        { value: "none", label: "None — profile details only (1 credit if matched)" },
        { value: "partial", label: "Partial — find email (2 credits if a valid one is found)" },
        { value: "phone", label: "Phone — find phone numbers (5 credits if one is found)" },
        { value: "full", label: "Full — email and phone" },
      ],
    },
    {
      key: "acceptWork",
      label: "Accept work emails",
      type: "boolean",
      hint: "If neither email option is set, all emails are returned.",
    },
    { key: "acceptPersonal", label: "Accept personal emails", type: "boolean" },
    {
      key: "callbackUrl",
      label: "Callback URL",
      type: "string",
      hint: "Receives the finished reveal as a POST. Defaults to the webhook URL in your account.",
    },
    {
      key: "fairKey",
      label: "Fair key",
      type: "string",
      hint:
        "Optional. Reveals are dispatched round-robin across distinct fair keys within your concurrency limit, so one end-user's burst cannot starve the others.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Reveal ID, for Get Individual Reveal" },
    { key: "status", type: "string", label: "queued | resolving | finished | failed" },
    { key: "is_complete", type: "boolean", label: "True once finished or failed" },
  ],

  async execute(input, ctx) {
    const reveal = compact({
      profile_url: input.profileUrl,
      email: input.email,
      full_name: input.fullName,
      company: input.company,
      domain: input.domain,
    });
    const hasName = reveal.full_name && (reveal.company || reveal.domain);
    if (!reveal.profile_url && !reveal.email && !hasName) {
      throw new Error(
        "provide a LinkedIn profile URL, an email, or a full name with a company or domain",
      );
    }
    const emailOptions: Record<string, boolean> = {};
    if (input.acceptWork !== undefined) emailOptions.accept_work = input.acceptWork;
    if (input.acceptPersonal !== undefined) emailOptions.accept_personal = input.acceptPersonal;
    const body = await new WizaClient(ctx).call("/api/individual_reveals", {
      method: "POST",
      body: compact({
        individual_reveal: reveal,
        enrichment_level: input.enrichmentLevel ?? "partial",
        email_options: Object.keys(emailOptions).length > 0 ? emailOptions : undefined,
        callback_url: input.callbackUrl,
        reveal_options: input.fairKey ? { fair_key: input.fairKey } : undefined,
      }),
    });
    return dataOf(body);
  },
};

export default startIndividualReveal;
