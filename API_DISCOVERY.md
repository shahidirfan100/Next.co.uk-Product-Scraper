# API Discovery

## Target
- Website: `https://www.next.co.uk/search?w=shirt`
- Goal: Replace HTML parsing with direct product search API extraction.

## Existing Actor Audit
- Previous actor extracted Remote.co job data using HTML selectors and JSON-LD.
- Existing fields were job-specific (`title`, `company`, `description_text`, etc.) and not relevant to Next product data.
- Missing for Next use case: product IDs, category filters, colourways, pricing ranges, ratings, and structured pagination metadata.

## Candidate Endpoints Reviewed

### Candidate A (Selected)
- Endpoint: `https://api.nextdirect.com/api/search/{realm}/{territory}/{language}/v1/item-aggregation`
- Method: `GET`
- Required query params: `criteria`, `type`, `start`, `pagesize`
- Optional query params used: `searchTerm`, `pageLoadTrigger`, `sliceSize`
- Auth: None
- Pagination: `start` + `pagesize`
- Notes:
  - Returns structured JSON with `items`, `filters`, `sorting`, `pagination`, and `productSummaries`.
  - Works with keyword criteria (`type=Keyword`) and category/shop criteria (`type=Category`).

### Candidate B
- Endpoint: `https://www.next.co.uk/api/search/{realm}/{territory}/{language}/v1/item-aggregation`
- Result: Blocked from direct use in this environment due edge protection.
- Decision: Rejected in favor of the stable public API host above.

### Candidate C
- Endpoint: `https://www.next.co.uk/plp-ui/api/v1/search-aggregation`
- Result: Non-stable from direct server calls (`500` in this environment without frontend context).
- Decision: Rejected.

### Candidate D
- Source: Search page HTML (`window.ssrClientSettings`, rendered tiles)
- Result: Available but HTML-coupled.
- Decision: Rejected because the actor requirement is API-first, not HTML parsing.

## Endpoint Scoring

| Factor | Points | Result |
|---|---:|---:|
| Returns JSON directly | 30 | 30 |
| Has >15 useful fields | 25 | 25 |
| No auth required | 20 | 20 |
| Pagination support | 15 | 15 |
| Extends legacy output richness | 10 | 10 |
| **Total** | **100** | **100** |

## Field Coverage Improvement
- Selected API exposes at least 30+ top-level and nested fields across:
  - Item identity (`itemNumber`, `type`, `newIn`)
  - Product summary (`brand`, `department`, `fit`, `productCategory`, `title`)
  - Colourway details (`colour`, `fits`, URL)
  - Price structures (`minPrice`, `maxPrice`, sale/was pricing)
  - Ratings (`overallStarRating`)
  - Search metadata (`totalResults`, filters, sorting, pagination)

## Request Reliability and Impit Profile Tests

Controlled tests were run on 2026-09-24 against the same public API request, using one reused Impit client and no proxy. The response was considered usable only when it returned HTTP 200 with JSON `items`, `productSummaries`, and `totalResults`.

| Request variation | Test case | Result | Decision |
|---|---|---|---|
| Chrome, `pagesize=100`, `sliceSize=100`, `pageLoadTrigger=infinite_scroll`, current endpoint headers | Jeans, `start=100`, 8 attempts | 2 returned 200 with 100 summaries; 6 returned 502 | Rejected as unreliable for 100-item API calls. |
| Chrome, `pagesize=100`, omit only `pageLoadTrigger`, keep `sliceSize=100` | Jeans, `start=100`, 3 attempts | 3 returned 502 | Rejected. |
| Chrome, `pagesize=100`, omit `sliceSize`, keep `pageLoadTrigger` | Jeans, `start=100`, 3 attempts | 3 returned 200 with 100 items but only 12 summaries | Rejected as a complete-page request because product detail coverage is incomplete. |
| Chrome, `pagesize=100`, `sliceSize=50` or `25` | Jeans, `start=100`, 2 attempts each | 2/2 returned 200, but summaries were limited to 50 or 25 | Rejected as a full-page shape because summaries do not cover all 100 items. |
| Chrome, `pagesize=50`, `sliceSize=50`, `pageLoadTrigger=infinite_scroll` | Jeans and shirt, starts `0`, `50`, `100`, `150` | 8/8 returned 200; each had 50 items, 50 usable product summaries, and `totalResults` | Selected. Preserves complete item and summary coverage in smaller requests. |
| Chrome with Impit's default `Accept` and `Accept-Language`, but full 100-item query | Jeans, `start=100`, 3 attempts | 1 returned 200 and 2 returned 502 | Not selected; no repeatable improvement. |
| `firefox`, `ios18`, and `okhttp4` Impit profiles with the original failing 100-item query | Jeans, `start=100` | Each tested alternative still returned 502 | Rejected; changing the browser/app profile did not address the request failure. |

The selected request keeps the documented API endpoint, GET method, Next-specific headers, Impit Chrome profile, and all user inputs. Each logical result page still covers up to 100 results, but it is collected as up to two 50-item API requests. `max_pages`, result limits, item mapping, and output fields remain unchanged. The smaller `sliceSize` matches the requested page size and returns one usable summary per item in the tested searches.

## Final Decision
Use `api.nextdirect.com` item aggregation endpoint as the primary data source and paginate with `start/pagesize`. Request no more than 50 items per API call, setting `sliceSize` to the same value, while keeping the actor's existing logical page and result limits. This satisfies the API-based requirement, reduces the request shape that repeatedly returned 502, and preserves product-summary coverage without depending on HTML parsing.