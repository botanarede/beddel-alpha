/**
 * Beddel Protocol - Google Business Profile Primitive
 * 
 * Integrates with Google Business Profile APIs to manage reviews,
 * posts, Q&A, and performance metrics for business locations.
 * 
 * Server-only: Uses googleapis which requires Node.js.
 * 
 * Supported Actions:
 * - listReviews: Fetch all reviews with auto-pagination
 * - replyReview: Reply to a specific review
 * - batchGetReviews: Fetch reviews from multiple locations
 * - createPost: Create a local post
 * - listPosts: List all posts for a location
 * - getMetrics: Fetch performance metrics
 * - listQuestions: List Q&A for a location
 * - answerQuestion: Answer a question
 * 
 * @see https://developers.google.com/my-business/content/overview
 */

import type { StepConfig, ExecutionContext, PrimitiveHandler } from '../types';
import { resolveVariables } from '../core/variable-resolver';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported actions for the Google Business primitive.
 */
type GoogleBusinessAction =
    | 'listReviews'
    | 'replyReview'
    | 'batchGetReviews'
    | 'createPost'
    | 'listPosts'
    | 'getMetrics'
    | 'listQuestions'
    | 'answerQuestion';

/**
 * Google Business step configuration from YAML.
 */
interface GoogleBusinessConfig extends StepConfig {
    /** Action to perform */
    action: GoogleBusinessAction;
    /** Google Business Account ID */
    accountId?: string;
    /** Location ID for the business */
    locationId?: string;
    /** Array of location names for batch operations */
    locationNames?: string[];
    /** Review name for reply operations */
    reviewName?: string;
    /** Comment text for replies */
    comment?: string;
    /** Question name for answer operations */
    questionName?: string;
    /** Answer text */
    answer?: string;
    /** Post data for createPost */
    post?: LocalPostInput;
    /** Metrics to fetch */
    metrics?: string[];
    /** Date range filter */
    dateRange?: string | DateRangeInput;
    /** Page size for pagination (default: 50) */
    pageSize?: number;
    /** Maximum pages to fetch (default: 10, set to -1 for unlimited) */
    maxPages?: number;
    /** Order by field */
    orderBy?: string;
    /** Ignore rating-only reviews */
    ignoreRatingOnlyReviews?: boolean;
}

/**
 * Date range input for filtering.
 */
interface DateRangeInput {
    startDate: string;
    endDate: string;
}

/**
 * Local post input structure.
 */
interface LocalPostInput {
    title?: string;
    summary: string;
    media?: Array<{
        mediaFormat: 'PHOTO' | 'VIDEO';
        sourceUrl: string;
    }>;
    callToAction?: {
        actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';
        url?: string;
    };
    event?: {
        title: string;
        schedule: {
            startDate: { year: number; month: number; day: number };
            endDate: { year: number; month: number; day: number };
            startTime?: { hours: number; minutes: number };
            endTime?: { hours: number; minutes: number };
        };
    };
    offer?: {
        couponCode?: string;
        redeemOnlineUrl?: string;
        termsConditions?: string;
    };
}


/**
 * Review structure from Google Business API.
 */
interface Review {
    reviewId: string;
    name: string;
    reviewer: {
        profilePhotoUrl?: string;
        displayName: string;
        isAnonymous?: boolean;
    };
    starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: {
        comment: string;
        updateTime: string;
    };
}

/**
 * Result from Google Business operations.
 */
interface GoogleBusinessResult {
    success: boolean;
    action: GoogleBusinessAction;
    data?: unknown;
    reviews?: Review[];
    totalReviewCount?: number;
    averageRating?: number;
    error?: string;
    [key: string]: unknown; // Index signature for Record<string, unknown> compatibility
}

// ============================================================================
// OAuth2 Token Management
// ============================================================================

/**
 * OAuth2 credentials structure.
 */
interface OAuth2Credentials {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    accessToken?: string;
    expiresAt?: number;
}

// Cache for access tokens
let cachedCredentials: OAuth2Credentials | null = null;

/**
 * Get OAuth2 credentials from environment variables.
 */
function getCredentials(): OAuth2Credentials {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error(
            '[Beddel Google Business] Missing credentials. Required env vars: ' +
            'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
        );
    }

    if (cachedCredentials &&
        cachedCredentials.clientId === clientId &&
        cachedCredentials.refreshToken === refreshToken) {
        return cachedCredentials;
    }

    cachedCredentials = { clientId, clientSecret, refreshToken };
    return cachedCredentials;
}

/**
 * Refresh the access token using the refresh token.
 */
async function refreshAccessToken(credentials: OAuth2Credentials): Promise<string> {
    // Check if we have a valid cached token
    if (credentials.accessToken && credentials.expiresAt) {
        const now = Date.now();
        // Token is valid if it expires more than 5 minutes from now
        if (credentials.expiresAt > now + 5 * 60 * 1000) {
            return credentials.accessToken;
        }
    }

    console.log('[Beddel Google Business] Refreshing access token...');

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            refresh_token: credentials.refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`[Beddel Google Business] Token refresh failed: ${error}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    credentials.accessToken = data.access_token;
    credentials.expiresAt = Date.now() + (data.expires_in * 1000);

    console.log('[Beddel Google Business] Access token refreshed successfully');
    return credentials.accessToken!;
}


// ============================================================================
// API Request Helper
// ============================================================================

/**
 * Make an authenticated request to Google Business API.
 */
async function apiRequest<T>(
    endpoint: string,
    options: {
        method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
        body?: unknown;
        baseUrl?: string;
    } = {}
): Promise<T> {
    const credentials = getCredentials();
    const accessToken = await refreshAccessToken(credentials);

    const { method = 'GET', body, baseUrl = 'https://mybusiness.googleapis.com/v4' } = options;
    const url = `${baseUrl}${endpoint}`;

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        fetchOptions.body = JSON.stringify(body);
    }

    console.log(`[Beddel Google Business] ${method} ${url}`);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
}

// ============================================================================
// Action Implementations
// ============================================================================

/**
 * List all reviews for a location with auto-pagination.
 */
async function listReviews(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { accountId, locationId, pageSize = 50, maxPages = 10, orderBy, ignoreRatingOnlyReviews } = config;

    if (!accountId || !locationId) {
        return { success: false, action: 'listReviews', error: 'Missing accountId or locationId' };
    }

    const allReviews: Review[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;
    let totalReviewCount = 0;
    let averageRating = 0;

    try {
        do {
            const params = new URLSearchParams();
            params.set('pageSize', String(pageSize));
            if (nextPageToken) params.set('pageToken', nextPageToken);
            if (orderBy) params.set('orderBy', orderBy);
            if (ignoreRatingOnlyReviews) params.set('ignoreRatingOnlyReviews', 'true');

            const endpoint = `/accounts/${accountId}/locations/${locationId}/reviews?${params}`;
            const response = await apiRequest<{
                reviews?: Review[];
                nextPageToken?: string;
                totalReviewCount?: number;
                averageRating?: number;
            }>(endpoint);

            if (response.reviews) {
                allReviews.push(...response.reviews);
            }
            if (response.totalReviewCount) {
                totalReviewCount = response.totalReviewCount;
            }
            if (response.averageRating) {
                averageRating = response.averageRating;
            }

            nextPageToken = response.nextPageToken;
            pageCount++;

            console.log(`[Beddel Google Business] Fetched page ${pageCount}, total reviews: ${allReviews.length}`);

        } while (nextPageToken && (maxPages === -1 || pageCount < maxPages));

        return {
            success: true,
            action: 'listReviews',
            reviews: allReviews,
            totalReviewCount,
            averageRating,
            data: {
                reviews: allReviews,
                totalReviewCount,
                averageRating,
                pagesFetched: pageCount,
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'listReviews', error: message };
    }
}

/**
 * Reply to a specific review.
 */
async function replyReview(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { reviewName, comment } = config;

    if (!reviewName || !comment) {
        return { success: false, action: 'replyReview', error: 'Missing reviewName or comment' };
    }

    try {
        const endpoint = `/${reviewName}/reply`;
        const response = await apiRequest<{ comment: string; updateTime: string }>(endpoint, {
            method: 'PUT',
            body: { comment },
        });

        return {
            success: true,
            action: 'replyReview',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'replyReview', error: message };
    }
}


/**
 * Batch get reviews from multiple locations.
 */
async function batchGetReviews(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { accountId, locationNames, pageSize = 50, orderBy, ignoreRatingOnlyReviews } = config;

    if (!accountId || !locationNames || locationNames.length === 0) {
        return { success: false, action: 'batchGetReviews', error: 'Missing accountId or locationNames' };
    }

    try {
        const endpoint = `/accounts/${accountId}/locations:batchGetReviews`;
        const response = await apiRequest<{
            locationReviews?: Array<{
                name: string;
                reviews?: Review[];
            }>;
        }>(endpoint, {
            method: 'POST',
            body: {
                locationNames,
                pageSize,
                orderBy: orderBy || 'update_time desc',
                ignoreRatingOnlyReviews: ignoreRatingOnlyReviews || false,
            },
        });

        const allReviews: Review[] = [];
        if (response.locationReviews) {
            for (const loc of response.locationReviews) {
                if (loc.reviews) {
                    allReviews.push(...loc.reviews);
                }
            }
        }

        return {
            success: true,
            action: 'batchGetReviews',
            reviews: allReviews,
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'batchGetReviews', error: message };
    }
}

/**
 * Create a local post for a location.
 */
async function createPost(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { accountId, locationId, post } = config;

    if (!accountId || !locationId || !post) {
        return { success: false, action: 'createPost', error: 'Missing accountId, locationId, or post data' };
    }

    try {
        const endpoint = `/accounts/${accountId}/locations/${locationId}/localPosts`;
        const response = await apiRequest<unknown>(endpoint, {
            method: 'POST',
            body: post,
        });

        return {
            success: true,
            action: 'createPost',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'createPost', error: message };
    }
}

/**
 * List all posts for a location.
 */
async function listPosts(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { accountId, locationId, pageSize = 50 } = config;

    if (!accountId || !locationId) {
        return { success: false, action: 'listPosts', error: 'Missing accountId or locationId' };
    }

    try {
        const params = new URLSearchParams();
        params.set('pageSize', String(pageSize));

        const endpoint = `/accounts/${accountId}/locations/${locationId}/localPosts?${params}`;
        const response = await apiRequest<{ localPosts?: unknown[] }>(endpoint);

        return {
            success: true,
            action: 'listPosts',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'listPosts', error: message };
    }
}

/**
 * Get performance metrics for a location.
 */
async function getMetrics(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { locationId, metrics, dateRange } = config;

    if (!locationId) {
        return { success: false, action: 'getMetrics', error: 'Missing locationId' };
    }

    try {
        // Use Business Performance API
        const baseUrl = 'https://businessprofileperformance.googleapis.com/v1';
        const endpoint = `/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`;

        const body: Record<string, unknown> = {};
        if (metrics) {
            body.dailyMetrics = metrics;
        }
        if (dateRange && typeof dateRange === 'object') {
            body.dailyRange = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
            };
        }

        const response = await apiRequest<unknown>(endpoint, {
            method: 'GET',
            baseUrl,
        });

        return {
            success: true,
            action: 'getMetrics',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'getMetrics', error: message };
    }
}


/**
 * List questions for a location.
 */
async function listQuestions(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { locationId, pageSize = 50 } = config;

    if (!locationId) {
        return { success: false, action: 'listQuestions', error: 'Missing locationId' };
    }

    try {
        const baseUrl = 'https://mybusinessqanda.googleapis.com/v1';
        const params = new URLSearchParams();
        params.set('pageSize', String(pageSize));

        const endpoint = `/locations/${locationId}/questions?${params}`;
        const response = await apiRequest<{ questions?: unknown[] }>(endpoint, { baseUrl });

        return {
            success: true,
            action: 'listQuestions',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'listQuestions', error: message };
    }
}

/**
 * Answer a question.
 */
async function answerQuestion(config: GoogleBusinessConfig): Promise<GoogleBusinessResult> {
    const { questionName, answer } = config;

    if (!questionName || !answer) {
        return { success: false, action: 'answerQuestion', error: 'Missing questionName or answer' };
    }

    try {
        const baseUrl = 'https://mybusinessqanda.googleapis.com/v1';
        const endpoint = `/${questionName}/answers`;
        const response = await apiRequest<unknown>(endpoint, {
            method: 'POST',
            baseUrl,
            body: { answer: { answer } },
        });

        return {
            success: true,
            action: 'answerQuestion',
            data: response,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, action: 'answerQuestion', error: message };
    }
}

// ============================================================================
// Main Primitive Handler
// ============================================================================

/**
 * Google Business Profile Primitive Handler
 * 
 * Executes Google Business Profile API operations based on the action specified.
 * Supports reviews, posts, Q&A, and performance metrics.
 * 
 * @param config - Step configuration from YAML
 * @param context - Execution context with input and variables
 * @returns GoogleBusinessResult with success status and data or error
 */
export const googleBusinessPrimitive: PrimitiveHandler = async (
    config: StepConfig,
    context: ExecutionContext
): Promise<Record<string, unknown>> => {
    const gbConfig = config as GoogleBusinessConfig;

    // Resolve variables in config
    const resolvedConfig: GoogleBusinessConfig = {
        ...gbConfig,
        action: gbConfig.action,
        accountId: gbConfig.accountId ? resolveVariables(gbConfig.accountId, context) as string : undefined,
        locationId: gbConfig.locationId ? resolveVariables(gbConfig.locationId, context) as string : undefined,
        locationNames: gbConfig.locationNames 
            ? resolveVariables(gbConfig.locationNames, context) as string[] 
            : undefined,
        reviewName: gbConfig.reviewName ? resolveVariables(gbConfig.reviewName, context) as string : undefined,
        comment: gbConfig.comment ? resolveVariables(gbConfig.comment, context) as string : undefined,
        questionName: gbConfig.questionName ? resolveVariables(gbConfig.questionName, context) as string : undefined,
        answer: gbConfig.answer ? resolveVariables(gbConfig.answer, context) as string : undefined,
        post: gbConfig.post ? resolveVariables(gbConfig.post, context) as LocalPostInput : undefined,
        metrics: gbConfig.metrics ? resolveVariables(gbConfig.metrics, context) as string[] : undefined,
        dateRange: gbConfig.dateRange ? resolveVariables(gbConfig.dateRange, context) as string | DateRangeInput : undefined,
        pageSize: gbConfig.pageSize,
        maxPages: gbConfig.maxPages,
        orderBy: gbConfig.orderBy,
        ignoreRatingOnlyReviews: gbConfig.ignoreRatingOnlyReviews,
    };

    // Validate action
    if (!resolvedConfig.action) {
        return { success: false, error: 'Missing required config: action' };
    }

    console.log(`[Beddel Google Business] Executing action: ${resolvedConfig.action}`);

    // Route to appropriate action handler
    switch (resolvedConfig.action) {
        case 'listReviews':
            return listReviews(resolvedConfig);

        case 'replyReview':
            return replyReview(resolvedConfig);

        case 'batchGetReviews':
            return batchGetReviews(resolvedConfig);

        case 'createPost':
            return createPost(resolvedConfig);

        case 'listPosts':
            return listPosts(resolvedConfig);

        case 'getMetrics':
            return getMetrics(resolvedConfig);

        case 'listQuestions':
            return listQuestions(resolvedConfig);

        case 'answerQuestion':
            return answerQuestion(resolvedConfig);

        default:
            return {
                success: false,
                error: `Unknown action: ${resolvedConfig.action}. ` +
                    'Supported: listReviews, replyReview, batchGetReviews, createPost, listPosts, getMetrics, listQuestions, answerQuestion',
            };
    }
};
