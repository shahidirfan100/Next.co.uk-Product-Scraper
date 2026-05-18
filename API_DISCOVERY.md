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

## Final Decision
Use `api.nextdirect.com` item aggregation endpoint as the primary data source and paginate with `start/pagesize`. This satisfies the API-based requirement and removes dependence on HTML parsing.