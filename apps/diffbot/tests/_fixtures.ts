export const ARTICLE_DOC = {
  request: { pageUrl: "https://example.com/post", api: "article", version: 3 },
  humanLanguage: "en",
  objects: [
    {
      type: "article",
      title: "Hello",
      author: "Ann",
      sentiment: 0.2,
      text: "Body",
      diffbotUri: "article|3|1",
    },
  ],
  title: "Hello - Example",
  type: "article",
};

export const PRODUCT_DOC = {
  request: { pageUrl: "https://shop.example/p/1", api: "product", version: 3 },
  humanLanguage: "en",
  objects: [{ type: "product", title: "Widget", offerPrice: "$9.99", brand: "Acme" }],
  type: "product",
  title: "Widget",
};

export const CRAWL_JOB = {
  name: "test-crawl",
  type: "crawl",
  jobStatus: { status: 7, message: "Job in progress" },
  objectsFound: 12,
  downloadJson: "https://api.diffbot.com/v3/crawl/download/SECRETTOKEN-test-crawl_data.json",
  downloadUrls: "https://api.diffbot.com/v3/crawl/download/SECRETTOKEN-test-crawl_urls.csv",
  apiUrl: "https://api.diffbot.com/v3/analyze",
};

export const DQL_RESPONSE = {
  version: 3,
  hits: 642,
  results: 2,
  kgversion: "477",
  diffbot_type: "Organization",
  facet: false,
  textFallback: false,
  data: [
    { score: 1584.3, entity: { name: "Yandex", nbEmployees: 26361 }, entity_ctx: {} },
    { score: 1558.7, entity: { name: "Google", nbEmployees: 187000 }, entity_ctx: {} },
  ],
};
