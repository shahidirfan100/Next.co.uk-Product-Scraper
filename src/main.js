import { readFile } from 'node:fs/promises';

import { Actor, log } from 'apify';
import { Impit } from 'impit';

const API_BASE_URL = 'https://api.nextdirect.com';
const DEFAULT_REALM = 'next';
const DEFAULT_TERRITORY = 'GB';
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_RESULTS_WANTED = 20;
const DEFAULT_MAX_PAGES = 10;
const MAX_PAGE_SIZE = 100;
const MAX_API_CHUNK_SIZE = 50;
const MAX_API_ATTEMPTS = 4;
const MAX_RETRY_DELAY_MS = 10_000;
const RETRYABLE_ERROR_CODES = new Set([
    'ECONNABORTED',
    'ECONNREFUSED',
    'ECONNRESET',
    'EAI_AGAIN',
    'EPIPE',
    'ETIMEDOUT',
    'ERR_SOCKET_CLOSED',
    'ENETUNREACH',
]);
const RETRYABLE_ERROR_NAMES = new Set([
    'CloseError',
    'ConnectError',
    'ConnectTimeout',
    'NetworkError',
    'PoolTimeout',
    'ReadError',
    'ReadTimeout',
    'RemoteProtocolError',
    'TimeoutError',
    'WriteError',
    'WriteTimeout',
]);
const hasApifyProxyCredentials = Boolean(process.env.APIFY_TOKEN || process.env.APIFY_PROXY_PASSWORD);

const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

const getRetryDelay = (attempt, retryAfter) => {
    if (retryAfter) {
        const retryAfterSeconds = Number(retryAfter);
        let retryAfterMs;

        if (Number.isFinite(retryAfterSeconds)) {
            retryAfterMs = retryAfterSeconds * 1000;
        } else {
            const retryAfterDate = Date.parse(retryAfter);
            if (Number.isFinite(retryAfterDate)) retryAfterMs = retryAfterDate - Date.now();
        }

        if (retryAfterMs !== undefined && retryAfterMs >= 0) {
            return Math.min(MAX_RETRY_DELAY_MS, retryAfterMs);
        }
    }

    const exponentialDelay = Math.min(1000 * (2 ** (attempt - 1)), 8000);
    return exponentialDelay + Math.floor(Math.random() * 500);
};

const isRetryableNetworkError = (error) => (
    RETRYABLE_ERROR_NAMES.has(error?.name)
    || RETRYABLE_ERROR_CODES.has(error?.code ?? error?.cause?.code)
);

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
};

const cleanString = (value) => {
    if (typeof value !== 'string') return '';
    return value.trim();
};

const normalizeTerritory = (value, fallback) => {
    const v = cleanString(value).toUpperCase();
    return v || fallback;
};

const normalizeLanguage = (value, fallback) => {
    const v = cleanString(value).toLowerCase();
    return v || fallback;
};

const normalizeRealm = (value, fallback) => {
    const v = cleanString(value).toLowerCase();
    return v || fallback;
};

const makeAbsoluteUrl = (value) => {
    if (!value) return null;
    try {
        return new URL(value).href;
    } catch {
        return null;
    }
};

const hasMeaningfulValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
};

const mergeInputWithFallback = ({ actorInput, fallbackInput }) => {
    const merged = { ...fallbackInput };

    for (const [key, value] of Object.entries(actorInput)) {
        if (hasMeaningfulValue(value)) {
            merged[key] = value;
        }
    }

    return merged;
};

const readFallbackInputFile = async () => {
    try {
        const raw = await readFile('INPUT.json', 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
    } catch {
        // Ignore missing or invalid INPUT.json fallback file.
    }

    return {};
};

const loadInputWithFallback = async () => {
    const actorInputRaw = await Actor.getInput();
    const actorInput = actorInputRaw && typeof actorInputRaw === 'object' ? actorInputRaw : {};
    const fallbackInput = await readFallbackInputFile();
    const mergedInput = mergeInputWithFallback({ actorInput, fallbackInput });

    const hasUserSeed = hasMeaningfulValue(actorInput.url) || hasMeaningfulValue(actorInput.keyword);
    const hasFallbackSeed = hasMeaningfulValue(fallbackInput.url) || hasMeaningfulValue(fallbackInput.keyword);

    // If user provided either URL or keyword, avoid leaking fallback seed values.
    if (hasUserSeed) {
        if (!hasMeaningfulValue(actorInput.url)) delete mergedInput.url;
        if (!hasMeaningfulValue(actorInput.keyword)) delete mergedInput.keyword;
    }

    if (!hasUserSeed && hasFallbackSeed) {
        log.info('Actor input not provided. Using fallback INPUT.json.');
    }

    return mergedInput;
};

const extractSearchTermFromUrl = (criteriaUrl) => {
    try {
        const parsed = new URL(criteriaUrl);
        const term = parsed.searchParams.get('w') || parsed.searchParams.get('q') || parsed.searchParams.get('searchTerm') || '';
        return cleanString(term);
    } catch {
        return '';
    }
};

const inferLocaleFromUrl = (criteriaUrl) => {
    try {
        const parsed = new URL(criteriaUrl);
        const host = parsed.hostname.toLowerCase();
        const pathParts = parsed.pathname.split('/').filter(Boolean);

        let territory = DEFAULT_TERRITORY;
        let language = DEFAULT_LANGUAGE;

        if (host === 'www.nextdirect.com') {
            if (pathParts[0]?.length === 2) territory = pathParts[0].toUpperCase();
            if (pathParts[1]?.length === 2) language = pathParts[1].toLowerCase();
            return { territory, language };
        }

        if (host.endsWith('next.co.uk')) {
            territory = 'GB';
        } else if (host.startsWith('www.next.') || host.startsWith('next.')) {
            const tldPart = host.split('.').slice(1).join('.');
            if (tldPart === 'co.uk') territory = 'GB';
            else {
                const rootTld = host.split('.').pop();
                if (rootTld) territory = rootTld.toUpperCase();
            }
        }

        if (pathParts[0]?.length === 2 && /^[a-z]{2}$/i.test(pathParts[0])) {
            language = pathParts[0].toLowerCase();
        }

        return { territory, language };
    } catch {
        return { territory: DEFAULT_TERRITORY, language: DEFAULT_LANGUAGE };
    }
};

const detectSearchType = (criteriaUrl, keyword, searchTerm) => {
    if (cleanString(keyword) || cleanString(searchTerm)) return 'Keyword';

    try {
        const parsed = new URL(criteriaUrl);
        const path = parsed.pathname.toLowerCase();
        if (path.includes('/search')) return 'Keyword';
    } catch {
        // Ignore URL parsing issue here and let validation fail later.
    }

    return 'Category';
};

const buildCriteriaUrl = ({ url, keyword }) => {
    const rawUrl = cleanString(url);
    if (rawUrl) {
        const parsed = makeAbsoluteUrl(rawUrl);
        if (!parsed) {
            throw new Error(`Invalid input URL: ${rawUrl}`);
        }
        return parsed;
    }

    const kw = cleanString(keyword);
    if (!kw) {
        throw new Error('Provide either `url` or `keyword` in actor input.');
    }

    return `https://www.next.co.uk/search?w=${encodeURIComponent(kw)}`;
};

const removeEmptyValues = (value) => {
    if (Array.isArray(value)) {
        const arr = value
            .map(removeEmptyValues)
            .filter((item) => item !== undefined);
        return arr.length ? arr : undefined;
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([k, v]) => [k, removeEmptyValues(v)])
            .filter(([, v]) => v !== undefined);
        if (!entries.length) return undefined;
        return Object.fromEntries(entries);
    }

    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;

    return value;
};

const getPrimaryColourway = (itemNumber, colourways) => {
    if (!Array.isArray(colourways) || colourways.length === 0) return null;

    const byItemNumber = colourways.find((cw) => cw?.itemNumber === itemNumber);
    if (byItemNumber) return byItemNumber;

    const byAnchor = colourways.find((cw) => {
        const link = cleanString(cw?.url).toLowerCase();
        return link.endsWith(`#${String(itemNumber).toLowerCase()}`);
    });
    if (byAnchor) return byAnchor;

    return colourways[0];
};

const buildProductUrl = (colourwayUrl) => {
    const relative = cleanString(colourwayUrl);
    if (!relative) return undefined;

    try {
        return new URL(relative.replace(/^\//, ''), 'https://www.next.co.uk/').href;
    } catch {
        return undefined;
    }
};

const mapRecord = ({
    item,
    productSummaryData,
    criteriaUrl,
    searchTerm,
    realm,
    territory,
    language,
    rank,
}) => {
    const summary = productSummaryData?.data?.productSummary || {};
    const colourway = getPrimaryColourway(item.itemNumber, summary.colourways || []);

    const rawPrice = colourway?.price?.price || {};
    const salePrice = colourway?.price?.salePrice?.price || {};
    const wasPrice = colourway?.price?.wasPrice?.price || {};

    const record = {
        rank,
        itemNumber: item.itemNumber,
        type: item.type,
        newIn: item.newIn,
        title: summary.title,
        productName: summary.productName,
        brand: summary.brand,
        department: summary.department,
        fit: summary.fit,
        productCategory: summary.productCategory,
        colour: colourway?.colour,
        rating: colourway?.overallStarRating,
        url: buildProductUrl(colourway?.url),
        image: item.itemNumber
            ? `https://xcdn.next.co.uk/Common/Items/Default/Default/ItemImages/3_4Ratio/Search/Lge/${item.itemNumber}.jpg`
            : undefined,
        currency: colourway?.price?.currencyCode,
        minPrice: rawPrice?.minPrice,
        maxPrice: rawPrice?.maxPrice,
        saleMinPrice: salePrice?.minPrice,
        saleMaxPrice: salePrice?.maxPrice,
        wasMinPrice: wasPrice?.minPrice,
        wasMaxPrice: wasPrice?.maxPrice,
        colourwaysCount: Array.isArray(summary.colourways) ? summary.colourways.length : undefined,
        availableFits: Array.isArray(colourway?.fits) ? colourway.fits : undefined,
        criteriaUrl,
        searchTerm: searchTerm || undefined,
        realm,
        territory,
        language,
    };

    return removeEmptyValues(record);
};

const getApiResponse = async ({
    criteriaUrl,
    searchTerm,
    type,
    start,
    pageSize,
    realm,
    territory,
    language,
    apiClient,
}) => {
    const url = `${API_BASE_URL}/api/search/${realm}/${territory}/${language}/v1/item-aggregation`;
    const siteUrl = new URL(criteriaUrl).origin;

    const params = {
        criteria: criteriaUrl,
        type,
        start,
        pagesize: pageSize,
        pageLoadTrigger: 'infinite_scroll',
        sliceSize: pageSize,
    };

    if (type === 'Keyword') {
        params.searchTerm = searchTerm;
    } else {
        params.searchTerm = '';
    }

    const requestUrl = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        requestUrl.searchParams.set(key, String(value));
    }

    for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt++) {
        let response;
        let responseBody;
        try {
            response = await apiClient.fetch(requestUrl.href, {
                method: 'GET',
                headers: {
                    accept: 'application/json, text/plain, */*',
                    'accept-language': `${language}-${territory},${language};q=0.9`,
                    'x-next-language': language,
                    'x-next-realm': realm,
                    'x-next-territory': territory,
                    'x-next-siteurl': siteUrl,
                    referer: criteriaUrl,
                },
                timeout: 45000,
            });
            responseBody = await response.text();
        } catch (error) {
            if (!isRetryableNetworkError(error) || attempt === MAX_API_ATTEMPTS) throw error;

            const retryDelay = getRetryDelay(attempt);
            log.warning(`Temporary Search API request error. Retrying in ${Math.ceil(retryDelay / 1000)}s (attempt ${attempt}/${MAX_API_ATTEMPTS}).`);
            await sleep(retryDelay);
            continue;
        }

        if (response.status === 200) {
            try {
                return JSON.parse(responseBody);
            } catch {
                throw new Error('Search API returned invalid JSON.');
            }
        }

        const shortBody = String(responseBody || '').replace(/\s+/g, ' ').slice(0, 300);

        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            throw new Error(`Search API returned ${response.status}: ${shortBody}`);
        }

        if ((response.status !== 429 && response.status < 500) || attempt === MAX_API_ATTEMPTS) {
            throw new Error(`Search API failed after retries with status ${response.status}: ${shortBody}`);
        }

        const retryDelay = getRetryDelay(attempt, response.headers.get('retry-after'));
        log.warning(`Search API returned HTTP ${response.status}. Retrying in ${Math.ceil(retryDelay / 1000)}s (attempt ${attempt}/${MAX_API_ATTEMPTS}).`);
        await sleep(retryDelay);
    }

    throw new Error('Search API request failed unexpectedly.');
};

await Actor.main(async () => {
    const input = await loadInputWithFallback();

    const criteriaUrl = buildCriteriaUrl({ url: input.url, keyword: input.keyword });
    const detectedLocale = inferLocaleFromUrl(criteriaUrl);

    const realm = normalizeRealm(input.realm, DEFAULT_REALM);
    const territory = normalizeTerritory(input.location || input.territory, detectedLocale.territory || DEFAULT_TERRITORY);
    const language = normalizeLanguage(input.language, detectedLocale.language || DEFAULT_LANGUAGE);

    const urlSearchTerm = extractSearchTermFromUrl(criteriaUrl);
    const keyword = cleanString(input.keyword);
    const searchTerm = keyword || urlSearchTerm;
    const type = detectSearchType(criteriaUrl, keyword, searchTerm);

    if (type === 'Keyword' && !searchTerm) {
        throw new Error('Could not detect search term. Provide `keyword` or use a search URL with `w=`.');
    }

    const resultsWanted = toPositiveInt(input.results_wanted, DEFAULT_RESULTS_WANTED);
    const maxPages = toPositiveInt(input.max_pages, DEFAULT_MAX_PAGES);
    const pageSize = Math.min(MAX_PAGE_SIZE, resultsWanted);

    const startPageRaw = toPositiveInt(new URL(criteriaUrl).searchParams.get('p'), 1);
    const initialStart = Math.max(0, (startPageRaw - 1) * pageSize);

    let proxyConfiguration;
    if (input.proxyConfiguration) {
        const wantsApifyProxy = typeof input.proxyConfiguration === 'object' && input.proxyConfiguration?.useApifyProxy;

        if (wantsApifyProxy && !hasApifyProxyCredentials) {
            log.warning('Apify Proxy requested but no APIFY_TOKEN/APIFY_PROXY_PASSWORD found. Continuing without proxy.');
        } else {
            try {
                proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
            } catch (error) {
                log.warning('Proxy configuration is invalid or unavailable. Continuing without proxy.', {
                    error: error.message,
                });
                proxyConfiguration = undefined;
            }
        }
    }

    let proxyUrl;
    if (proxyConfiguration) {
        try {
            proxyUrl = await proxyConfiguration.newUrl();
        } catch (error) {
            log.warning('Proxy URL could not be created for this run. Continuing without proxy.', {
                error: error.message,
            });
        }
    }

    const apiClient = new Impit({
        browser: 'chrome',
        ...(proxyUrl && { proxyUrl }),
    });

    log.info('Starting Next product extraction via search API.', {
        criteriaUrl,
        type,
        searchTerm: searchTerm || '(none)',
        realm,
        territory,
        language,
        resultsWanted,
        maxPages,
        pageSize,
        initialStart,
    });

    const seen = new Set();
    let saved = 0;
    let stopPagination = false;

    for (let page = 0; page < maxPages && saved < resultsWanted && !stopPagination; page++) {
        const pageStart = initialStart + (page * pageSize);
        const chunkCount = Math.ceil(pageSize / MAX_API_CHUNK_SIZE);

        for (let chunkOffset = 0; chunkOffset < pageSize && saved < resultsWanted; chunkOffset += MAX_API_CHUNK_SIZE) {
            const start = pageStart + chunkOffset;
            const requestPageSize = Math.min(MAX_API_CHUNK_SIZE, pageSize - chunkOffset);
            const apiData = await getApiResponse({
                criteriaUrl,
                searchTerm,
                type,
                start,
                pageSize: requestPageSize,
                realm,
                territory,
                language,
                apiClient,
            });

            const items = Array.isArray(apiData.items) ? apiData.items : [];
            const summaries = Array.isArray(apiData.productSummaries) ? apiData.productSummaries : [];

            if (!items.length) {
                log.info(`No results on page ${page + 1}. Stopping pagination.`);
                stopPagination = true;
                break;
            }

            const batch = [];

            for (let index = 0; index < items.length && saved + batch.length < resultsWanted; index++) {
                const item = items[index];
                const dedupeKey = `${item?.itemNumber || 'unknown'}::${item?.type || 'unknown'}`;
                if (seen.has(dedupeKey)) continue;

                const mapped = mapRecord({
                    item,
                    productSummaryData: summaries[index],
                    criteriaUrl,
                    searchTerm,
                    realm,
                    territory,
                    language,
                    rank: start + index + 1,
                });

                if (!mapped) continue;

                seen.add(dedupeKey);
                batch.push(mapped);
            }

            if (batch.length > 0) {
                await Actor.pushData(batch);
                saved += batch.length;
                const chunkNumber = Math.floor(chunkOffset / MAX_API_CHUNK_SIZE) + 1;
                log.info(`Saved ${batch.length} items from page ${page + 1}, chunk ${chunkNumber}/${chunkCount}. Total: ${saved}/${resultsWanted}`);
            }

            if (items.length < requestPageSize) {
                log.info('Reached last page based on returned item count.');
                stopPagination = true;
                break;
            }
        }
    }

    log.info(`Extraction finished. Total items saved: ${saved}`);
});
