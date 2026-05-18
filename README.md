# Next.co.uk Product Scraper

Extract product data from Next search and category pages using either a direct URL or a keyword. Collect clean, structured product results with pricing, ratings, product links, and images. This scraper is designed for catalog research, market monitoring, and merchandising analysis workflows.

## Features

- **URL or keyword input** — Start from a Next URL or a plain search keyword.
- **Location-aware extraction** — Choose territory and language to target regional catalogs.
- **Pagination control** — Limit by result count and page count for predictable runs.
- **Rich product output** — Capture titles, brand, category, pricing, ratings, and links.
- **Clean dataset records** — Empty and null fields are removed from output.

## Use Cases

### Product Research
Track product assortments by keyword or category and compare catalog depth across departments.

### Pricing Intelligence
Monitor list prices and identify pricing patterns by brand, category, or territory.

### Merchandising Analysis
Build sortable datasets for ranking analysis, product coverage checks, and campaign planning.

### Regional Catalog Comparison
Run the same search in multiple territories to compare availability and product mix.

### Data Enrichment Pipelines
Feed output into BI dashboards, spreadsheets, or internal tools for downstream analysis.

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | String | No | `https://www.next.co.uk/search?w=shirt` | Any supported Next URL (search or category/shop URL). |
| `keyword` | String | No | `shirt` | Search keyword when `url` is not provided. |
| `location` | String | No | `GB` | Territory code such as `GB`, `OM`, `PL`, `AE`. |
| `language` | String | No | `en` | Language code such as `en`. |
| `results_wanted` | Integer | No | `20` | Maximum number of products to return. |
| `max_pages` | Integer | No | `10` | Maximum pages to request before stopping. |
| `proxyConfiguration` | Object | No | Apify Proxy enabled | Proxy settings for stable extraction. |

---

## Output Data

Each dataset item includes:

| Field | Type | Description |
|-------|------|-------------|
| `rank` | Integer | Position in the result stream. |
| `itemNumber` | String | Unique Next item number. |
| `title` | String | Product title. |
| `productName` | String | Product name label from source catalog. |
| `brand` | String | Brand name. |
| `department` | String | Department name. |
| `fit` | String | Fit value when available. |
| `productCategory` | String | Product category. |
| `colour` | String | Selected colourway. |
| `currency` | String | Currency code for pricing. |
| `minPrice` | Number | Minimum listed price. |
| `maxPrice` | Number | Maximum listed price. |
| `saleMinPrice` | Number | Minimum sale price when available. |
| `saleMaxPrice` | Number | Maximum sale price when available. |
| `wasMinPrice` | Number | Previous minimum price when available. |
| `wasMaxPrice` | Number | Previous maximum price when available. |
| `rating` | Number | Product rating when available. |
| `url` | String | Product detail URL. |
| `image` | String | Product image URL. |
| `newIn` | Boolean | Whether product is marked as new. |
| `territory` | String | Territory used for extraction. |
| `language` | String | Language used for extraction. |
| `searchTerm` | String | Search term for keyword-based runs. |

---

## Usage Examples

### Keyword Search

```json
{
  "keyword": "shirt",
  "results_wanted": 50,
  "max_pages": 5
}
```

### Search URL

```json
{
  "url": "https://www.next.co.uk/search?w=linen%20shirt",
  "results_wanted": 40,
  "max_pages": 4
}
```

### Category URL in Specific Territory

```json
{
  "url": "https://www.next.om/en/shop/category-dresses",
  "location": "OM",
  "language": "en",
  "results_wanted": 60,
  "max_pages": 6
}
```

---

## Sample Output

```json
{
  "rank": 1,
  "itemNumber": "V09112",
  "title": "Soft Relaxed Long Sleeve Shirt",
  "productName": "STRIPE SHIRT",
  "brand": "Next",
  "department": "Womenswear",
  "fit": "Regular",
  "productCategory": "Shirts",
  "colour": "Pink/White Stripe",
  "currency": "GBP",
  "minPrice": 28,
  "maxPrice": 28,
  "rating": 4.5054,
  "url": "https://www.next.co.uk/style/SU773076/V09112#V09112",
  "image": "https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Search/Lge/V09112.jpg",
  "newIn": false,
  "territory": "GB",
  "language": "en",
  "searchTerm": "shirt"
}
```

---

## Tips for Best Results

### Choose the Right Start Point
- Use `keyword` for broad discovery.
- Use `url` when you want a specific filtered catalog page.

### Keep Runs Efficient
- Start with `results_wanted: 20` for quick validation.
- Increase result limits gradually for large exports.

### Control Pagination
- Use `max_pages` as a safety cap for long-running category extractions.
- Combine `max_pages` and `results_wanted` for tighter run boundaries.

### Run Region-Specific Queries
- Set `location` to a territory code that matches your target storefront.
- Keep `language` aligned with the storefront URL for consistent results.

### Proxy Configuration
- Use proxy settings for improved reliability at scale.

---

## Integrations

Connect your dataset with:

- **Google Sheets** — For quick tabular review and collaboration.
- **Airtable** — For catalog audits and tracking workflows.
- **Make** — For automation between runs and downstream tools.
- **Zapier** — For no-code processing and alerts.
- **Webhooks** — For custom pipelines and internal systems.

### Export Formats

- **JSON** — Flexible machine-readable format.
- **CSV** — Spreadsheet-friendly export.
- **Excel** — Business reporting workflows.
- **XML** — Legacy system integrations.

---

## Frequently Asked Questions

### Do I need both `url` and `keyword`?
No. You can provide either one. If both are present, the URL is used as the primary source.

### How many products can I extract?
You can extract large volumes by increasing `results_wanted` and `max_pages`, based on available data.

### Why are some optional fields missing?
Some products do not publish every attribute in every territory. Empty values are removed from output.

### Can I run this for non-UK catalogs?
Yes. Set `location` and `language` to the regional storefront you want.

### Does the scraper handle pagination automatically?
Yes. It advances page-by-page until limits are reached or no more products are returned.

### Can I schedule this actor?
Yes. Use Apify schedules to run daily, hourly, or on custom intervals.

---

## Support

For issues or feature requests, contact support through the Apify Console.

### Resources

- [Apify Documentation](https://docs.apify.com/)
- [Apify API Reference](https://docs.apify.com/api/v2)
- [Apify Schedules](https://docs.apify.com/schedules)

---

## Legal Notice

This actor is intended for legitimate data collection and analysis. You are responsible for complying with website terms, local regulations, and applicable data-use policies.