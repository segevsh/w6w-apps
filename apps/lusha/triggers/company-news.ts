import { webhookTrigger } from "../lib/triggers.ts";

/** News about a watched company: partnership, funding, M&A, executive moves, product launch, risk. */
const companyNews = webhookTrigger({
  key: "company-news",
  title: "Company News",
  description:
    "Fires when Lusha detects news about a company you watch: commercial activity, corporate strategy, financial events, market intelligence, people, product activity or risk (the seven *News signals). The run gets the signal type, the company id, the subscription, the signal time, the credits charged and the signal data (event type, summary, article title, URL and dates).",
  fixed: {
    entityType: "company",
    signalTypes: [
      "commercialActivityNews",
      "corporateStrategyNews",
      "financialEventsNews",
      "marketIntelligenceNews",
      "peopleNews",
      "productActivityNews",
      "riskNews",
    ],
  },
  sample: {
    id: "f3b87e05-0402-4f3e-8e26-6a38fd0ad62c",
    type: "commercialActivityNews",
    entityType: "company",
    entityId: "33222678",
    subscriptionId: "507f1f77bcf86cd799439011",
    timestamp: "2026-01-14T16:16:35.841Z",
    creditsCharged: 1,
    data: {
      companyId: "33222678",
      companyName: "Lusha",
      domain: "lusha.com",
      signalId: "1503910",
      eventType: "partnership",
      eventSummary: "Lusha announced a strategic partnership with Salesforce.",
      articlePublishedDate: "2025-06-15",
      articleTitle: "Lusha Partners with Salesforce",
      articleUrl: "https://example.com/lusha-salesforce-partnership",
    },
  },
});

export default companyNews;
