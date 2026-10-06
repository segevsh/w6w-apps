import type { ActionDefinition } from "@w6w/types";
import { EconomicClient } from "../lib/client.ts";

interface Self {
  agreementNumber?: number;
  userName?: string;
  signupDate?: string;
  company?: { name?: string; country?: string; companyIdentificationNumber?: string };
  settings?: { baseCurrency?: string; defaultPaymentTerm?: string };
  modules?: Array<{ moduleNumber?: number; name?: string }>;
}

const selfGet: ActionDefinition<Record<string, never>> = {
  key: "self-get",
  type: "read",
  resource: "agreement",
  title: "Get Agreement",
  description:
    "Read the connected e-conomic agreement: company, base currency, default payment term and enabled modules. Returns a curated subset (the raw response also names the integration's app).",
  params: [],
  output: [
    { key: "agreementNumber", type: "number", label: "Agreement number" },
    { key: "companyName", type: "string", label: "Company name" },
    { key: "country", type: "string", label: "Country" },
    { key: "baseCurrency", type: "string", label: "Base currency" },
    { key: "defaultPaymentTerm", type: "string", label: "Default payment term number" },
    { key: "modules", type: "array", label: "Enabled modules" },
  ],
  async execute(_input, ctx) {
    const s = await new EconomicClient(ctx).request<Self>("GET", "/self");
    return {
      agreementNumber: s.agreementNumber,
      companyName: s.company?.name,
      country: s.company?.country,
      baseCurrency: s.settings?.baseCurrency,
      defaultPaymentTerm: s.settings?.defaultPaymentTerm,
      modules: (s.modules ?? []).map((m) => ({ moduleNumber: m.moduleNumber, name: m.name })),
    };
  },
};

export default selfGet;
