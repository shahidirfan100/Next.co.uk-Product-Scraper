## What does Next.co.uk Product Scraper do?

Next.co.uk Product Scraper collects structured product data from Next search and category pages. Start with a product keyword or a public Next page URL, then review product identifiers, titles, brands, colours, prices, ratings, product links, and images in an Apify dataset. The data can support product research, price comparisons, assortment checks, and recurring catalog monitoring.

Choose one search source for each run: a `keyword` or a `url`. The input form may show an example URL; clear it before running a keyword-only search. The Actor can collect products across result pages until it reaches `results_wanted`, reaches `max_pages`, or the source has no more results.

## Why use Next.co.uk Product Scraper?

- **Research product assortments** - Compare products across Next departments, categories, colours, and fits.
- **Track prices** - Capture current price ranges and, when available, sale and previous price ranges.
- **Review product performance signals** - Collect ratings and product attributes when published by Next.
- **Create repeatable datasets** - Run searches on demand or schedule them in Apify for ongoing catalog monitoring.
- **Connect results to other tools** - Download the dataset or use Apify integrations, webhooks, and the API in your workflow.

## What data can you extract from Next?

The Actor saves one dataset item per product. Fields that are empty or unavailable for a product are omitted, so an individual record may contain only a subset of the fields below.

| Field             | Type    | Description                                            |
| ----------------- | ------- | ------------------------------------------------------ |
| `rank`            | Integer | Product position in the result stream.                 |
| `itemNumber`      | String  | Next product item number.                              |
| `type`            | String  | Product type when provided.                            |
| `newIn`           | Boolean | Whether the product is marked as new.                  |
| `title`           | String  | Product title.                                         |
| `productName`     | String  | Product name from the catalog.                         |
| `brand`           | String  | Brand name.                                            |
| `department`      | String  | Department, such as Menswear or Womenswear.            |
| `fit`             | String  | Product fit when available.                            |
| `productCategory` | String  | Product category.                                      |
| `colour`          | String  | Colour of the selected product colourway.              |
| `rating`          | Number  | Product star rating when available.                    |
| `url`             | String  | Product detail page URL.                               |
| `image`           | String  | Product image URL.                                     |
| `currency`        | String  | Currency code for the listed prices.                   |
| `minPrice`        | Number  | Minimum listed price.                                  |
| `maxPrice`        | Number  | Maximum listed price.                                  |
| `saleMinPrice`    | Number  | Minimum sale price when available.                     |
| `saleMaxPrice`    | Number  | Maximum sale price when available.                     |
| `wasMinPrice`     | Number  | Minimum previous price when available.                 |
| `wasMaxPrice`     | Number  | Maximum previous price when available.                 |
| `colourwaysCount` | Integer | Number of colourways listed for the product.           |
| `availableFits`   | Array   | Fits available for the selected colourway.             |
| `criteriaUrl`     | String  | Search or category URL used for the run.               |
| `searchTerm`      | String  | Search term used for a keyword search, when available. |
| `realm`           | String  | Next catalog realm used for the request.               |
| `territory`       | String  | Territory used for the request, such as `GB`.          |
| `language`        | String  | Language used for the request, such as `en`.           |

## How to use Next.co.uk Product Scraper

1. Open the Actor in Apify Console.
2. Enter either a product `keyword` or a Next search/category `url`. Do not leave the example URL filled in for a keyword-only run.
3. Set `results_wanted` and `max_pages` to control the collection size.
4. Optionally configure Apify Proxy if you want requests routed through it.
5. Run the Actor, then review the dataset count and product records.
6. Export the dataset or connect it to a schedule or downstream workflow.

## Input Parameters

| Parameter            | Type    | Required | Default or prefill                                       | Description                                                                            |
| -------------------- | ------- | -------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `url`                | String  | No       | Console prefill: `https://www.next.co.uk/search?w=shirt` | Public Next search or category page. When using `keyword`, clear this prefilled value. |
| `keyword`            | String  | No       | None                                                     | Product search term, such as `shirt` or `linen shirt`. Use when `url` is not supplied. |
| `location`           | String  | No       | `GB`                                                     | Territory code used for the catalog, such as `GB`, `OM`, `PL`, or `AE`.                |
| `language`           | String  | No       | `en`                                                     | Language code used for the catalog.                                                    |
| `results_wanted`     | Integer | No       | `20`                                                     | Maximum number of product records to save. Minimum: `1`.                               |
| `max_pages`          | Integer | No       | `10`                                                     | Maximum number of result pages to process, with up to 100 products per page. Minimum: `1`. |
| `proxyConfiguration` | Object  | No       | `{ "useApifyProxy": false }`                             | Optional Apify Proxy configuration.                                                    |

`url` is prefilled in the Apify input form as an example, but it is not a runtime default. For a keyword search, remove the URL value so it does not take priority over the keyword.

## Usage Examples

### Basic keyword search

Search Next for shirts and save up to 50 products. In the input form, clear the example `url` before starting this keyword-only run.

```json
{
    "keyword": "shirt",
    "results_wanted": 50,
    "max_pages": 5
}
```

### Search from a Next URL

Use a public Next search URL when you already have the search phrase encoded in the page address.

```json
{
    "url": "https://www.next.co.uk/search?w=linen%20shirt",
    "results_wanted": 40,
    "max_pages": 4,
    "location": "GB",
    "language": "en"
}
```

### Larger run with Apify Proxy

Enable Apify Proxy for a larger collection when you want the run to use proxy routing. Proxy availability depends on your Apify account configuration.

```json
{
    "url": "https://www.next.co.uk/search?w=shirt",
    "results_wanted": 200,
    "max_pages": 10,
    "proxyConfiguration": {
        "useApifyProxy": true
    }
}
```

## Sample Output

This example is based on a product record collected from Next. Optional fields can be absent when the source does not provide them.

```json
{
    "itemNumber": "C00769",
    "title": "Easy Care Single Cuff Smart Shirt",
    "brand": "Next",
    "department": "Menswear",
    "fit": "Slim Fit",
    "colour": "White",
    "rating": 4.6,
    "currency": "GBP",
    "minPrice": 22,
    "maxPrice": 22,
    "image": "https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Search/Lge/C00769.jpg",
    "colourwaysCount": 5,
    "availableFits": ["Regular", "Skinny", "Slim"],
    "criteriaUrl": "https://www.next.co.uk/search?w=shirt",
    "searchTerm": "shirt",
    "realm": "next",
    "territory": "GB",
    "language": "en"
}
```

## Tips for Best Results

- Use a specific keyword such as `linen shirt` when you want a more focused result set.
- For a keyword-only run, remove the example URL from the input form. A supplied URL takes precedence as the search criteria.
- Start with a smaller `results_wanted` value to confirm the query and inspect the returned fields.
- Increase `max_pages` when you need more coverage, while keeping `results_wanted` at the desired output limit.
- Use territory and language values that match the Next storefront you want to query.
- Check multiple products before treating an absent optional field as a collection problem. Next may not publish every attribute for every product or region.

## Temporary Errors and Retries

The Actor makes a limited number of retries for temporary connection failures and retryable server responses, including HTTP 429 and 5xx responses. A retry warning in the log does not by itself mean the run failed. Check the final run status and the number of products saved. If the source continues returning errors after the retry attempts, the run can still fail.

For example, a run recorded on 24 September 2026 received two HTTP 502 responses, recovered on retry, and then saved 100 products from each of two pages, for 200 of 200 requested products. This is evidence of one successful recovery, not a guarantee that every run will recover from source-side errors.

## Integrations and Export Formats

- **Google Sheets** - Review and compare product prices or assortment data in a spreadsheet.
- **Webhooks** - Notify another service when an Actor run finishes.
- **Make and Zapier** - Send product records into no-code workflows.
- **Apify API** - Read dataset records from your applications or scheduled jobs.

Apify datasets can be exported in formats such as JSON, CSV, Excel, and XML.

## Frequently Asked Questions

### Why does the log show a retry warning if the run succeeded?

A retry warning records a temporary failure that the Actor recovered from. Confirm success by checking the final run status and the saved item count, rather than judging the run from an intermediate warning alone.

### Does the Actor always return the requested number of products?

No. The Actor stops at `results_wanted` or `max_pages`, and it may return fewer records when the selected page has fewer products or the source does not provide enough results. Persistent source errors can also prevent a complete run.

### Should I provide both a URL and a keyword?

Use one search source per run. A supplied `url` determines the page criteria, so clear the prefilled URL when you want a keyword-only search.

### Why are some fields missing?

Fields are omitted when Next does not provide a value for a product or colourway. A missing optional field does not necessarily indicate that the product was not collected.

### Can I schedule recurring product checks?

Yes. Create an Apify schedule and choose an interval for repeat runs. Compare the resulting datasets to review changes in product prices or assortment.

### Can I export products to CSV or Excel?

Yes. Apify datasets support CSV and Excel exports, as well as JSON, XML, and other formats available in Apify Console.

### Is it legal to collect Next product data?

You are responsible for complying with Next's terms, applicable laws, and any rules that apply to your use, storage, or redistribution of collected data.

## Related Actors

- [H&M Product Scraper](https://apify.com/shahidirfan/h-m-product-scraper) - Collect fashion product data for catalog and price research.
- [Shein Product Scraper](https://apify.com/shahidirfan/shein-product-scraper) - Gather apparel listings and product details from Shein.
- [Flipkart Product Scraper](https://apify.com/shahidirfan/flipkart-product-scraper) - Collect product listings and pricing from the Flipkart marketplace.

## Support

For issues, feature requests, or questions about a run, use the Issues tab on the Actor's Apify page or contact the developer through Apify.

## Legal Notice

This Actor is intended for legitimate collection and analysis of publicly available product information. You are responsible for following Next's terms and complying with all applicable laws and privacy requirements. Use the collected data responsibly.
