# Google Business Profile Primitive - Research Report

> **Session Date**: December 30, 2025  
> **Status**: Research & Planning  
> **Priority**: High (First of 100 planned integrations)

---

## Executive Summary

This document captures the research session for implementing a Google Business Profile primitive in Beddel. The goal is to enable automated analysis of business reviews and performance metrics for clients with high review volumes.

---

## 1. Google Business Profile APIs Overview

The Google Business Profile API is divided into multiple specialized sub-APIs:

| API | Endpoint Base | Functionality |
|-----|---------------|---------------|
| **Business Information API** | `mybusinessbusinessinformation.googleapis.com/v1` | Manage business info (name, address, hours) |
| **Business Performance API** | `businessprofileperformance.googleapis.com/v1` | Metrics and insights (views, clicks, calls) |
| **Reviews API** | `mybusiness.googleapis.com/v4` | List reviews, reply to reviews |
| **Q&A API** | `mybusinessqanda.googleapis.com/v1` | Questions and answers management |
| **Local Posts API** | `mybusiness.googleapis.com/v4` | Create/manage posts (offers, events, updates) |
| **Notifications API** | `mybusinessnotifications.googleapis.com/v1` | Configure Pub/Sub notifications |
| **Verifications API** | `mybusinessverifications.googleapis.com/v1` | Business ownership verification |

---

## 2. Key API Operations

### 2.1 Reviews API

```http
# List all reviews for a location
GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews

# Batch get reviews from multiple locations
POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations:batchGetReviews
{
  "locationNames": ["locations/123", "locations/456"],
  "pageSize": 50,
  "orderBy": "update_time desc",
  "ignoreRatingOnlyReviews": false
}

# Reply to a review
POST https://mybusiness.googleapis.com/v4/{name=accounts/*/locations/*/reviews/*}/reply
{
  "comment": "Thank you for your feedback!"
}
```

**Response Structure:**
```json
{
  "reviews": [
    {
      "reviewId": "review123",
      "name": "locations/12345/reviews/review123",
      "rating": 5,
      "comment": "Great service!",
      "createTime": "2023-10-26T09:00:00Z",
      "updateTime": "2023-10-27T10:00:00Z",
      "authorAttribution": {
        "displayName": "John Doe",
        "photoUrl": "https://example.com/photo.jpg"
      }
    }
  ],
  "nextPageToken": "nextTokenXYZ"
}
```

### 2.2 Local Posts API

```http
# Create a new post
POST https://mybusiness.googleapis.com/v4/{parent=accounts/*/locations/*}/localPosts
{
  "title": "New Product Launch!",
  "content": "Check out our latest product!",
  "media": [{"mediaFormat": "PHOTO", "url": "https://..."}],
  "callToAction": {"actionType": "LEARN_MORE", "url": "https://..."}
}

# List posts
GET https://mybusiness.googleapis.com/v4/{parent=accounts/*/locations/*}/localPosts

# Get post insights
POST https://mybusiness.googleapis.com/v4/{name=accounts/*/locations/*}/localPosts:reportInsights
```

### 2.3 Q&A API

```http
# List questions
GET https://mybusinessqanda.googleapis.com/v1/{parent=locations/*}/questions

# Answer a question
POST https://mybusinessqanda.googleapis.com/v1/{parent=locations/*/questions/*}/answers
{
  "answer": {"answer": "Our hours are 9am-5pm Monday-Friday."}
}
```

### 2.4 Performance API

```http
# Fetch daily metrics
GET https://businessprofileperformance.googleapis.com/v1/{name=locations/*}:fetchMultiDailyMetricsTimeSeries
```

---

## 3. Authentication Requirements

| Method | Scope |
|--------|-------|
| OAuth 2.0 | `https://www.googleapis.com/auth/business.manage` |
| Service Account | Requires domain-wide delegation |

**Environment Variables Needed:**
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
# OR
GOOGLE_SERVICE_ACCOUNT_KEY=path/to/service-account.json
```

---

## 4. Proposed Primitive Design

### 4.1 Primitive Name: `google-business`

### 4.2 Supported Actions

| Action | Description | Input | Output |
|--------|-------------|-------|--------|
| `listReviews` | Fetch all reviews with pagination | `locationId`, `dateRange?`, `pageSize?` | `Review[]` |
| `replyReview` | Reply to a specific review | `reviewName`, `comment` | `Reply` |
| `batchGetReviews` | Fetch reviews from multiple locations | `locationNames[]` | `Review[]` |
| `createPost` | Create a local post | `locationId`, `post` | `LocalPost` |
| `listPosts` | List all posts | `locationId` | `LocalPost[]` |
| `getMetrics` | Fetch performance metrics | `locationId`, `metrics[]`, `dateRange` | `Metrics` |
| `listQuestions` | List Q&A | `locationId` | `Question[]` |
| `answerQuestion` | Answer a question | `questionName`, `answer` | `Answer` |

### 4.3 YAML Usage Example

```yaml
metadata:
  name: "Google Business Analyzer"
  version: "1.0.0"

workflow:
  # Step 1: Fetch all reviews
  - id: "fetch-reviews"
    type: "google-business"
    config:
      action: "listReviews"
      locationId: "$input.locationId"
      dateRange: "last_90_days"
      pageSize: 100
    result: "reviews"

  # Step 2: Analyze with AI
  - id: "analyze-sentiment"
    type: "llm"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: |
        Analyze these business reviews and provide:
        1. Overall sentiment score (1-10)
        2. Top 5 positive themes
        3. Top 5 areas for improvement
        4. Reviews requiring urgent response
        5. Trend analysis
      messages:
        - role: "user"
          content: |
            Reviews data:
            $stepResult.reviews
    result: "analysis"

  # Step 3: Generate response suggestions
  - id: "generate-responses"
    type: "llm"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: |
        For each negative review (rating <= 3), generate a professional,
        empathetic response suggestion. Be specific to the complaint.
      messages:
        - role: "user"
          content: "$stepResult.reviews"
    result: "responseSuggestions"
```

---

## 5. Architecture Decision: Primitive vs MCP

### 5.1 Comparison Matrix

| Aspect | Native Primitive | MCP Server |
|--------|------------------|------------|
| **Setup** | Zero config (bundled) | Requires MCP server running |
| **Performance** | Direct, no overhead | +1 hop (SSE connection) |
| **Maintenance** | Beddel team maintains | Community/third-party maintains |
| **Flexibility** | Full control | Depends on server capabilities |
| **Ecosystem** | Beddel only | Any MCP client |
| **Auth** | Built-in OAuth flow | Server handles auth |

### 5.2 Recommendation: Native Primitive

**Reasons:**
1. ❌ No official MCP server exists for Google Business Profile
2. ✅ Requires complex pagination logic (high-volume reviews)
3. ✅ OAuth2 authentication is complex (better to abstract)
4. ✅ High demand for local business analytics
5. ✅ Zero-config experience for Beddel users

### 5.3 Hybrid Strategy for 100 Tools

| Tier | Strategy | Examples |
|------|----------|----------|
| **Tier 1 - Native Primitive** | APIs without MCP + high demand | Google Business, Google Sheets, WhatsApp Business |
| **Tier 2 - MCP Existing** | Use `mcp-tool` primitive | Notion, GitHub, Slack, Postgres |
| **Tier 3 - MCP + Wrapper** | Simplify config | Services with MCP but complex setup |
| **Tier 4 - HTTP Generic** | `http-fetch` primitive | Simple REST APIs |

---

## 6. Implementation Plan

### Phase 1: Core Primitive (Week 1)
- [ ] Create `src/primitives/google-business.ts`
- [ ] Implement OAuth2 token management
- [ ] Implement `listReviews` with auto-pagination
- [ ] Implement `replyReview`
- [ ] Add to handler registry

### Phase 2: Extended Actions (Week 2)
- [ ] Implement `batchGetReviews`
- [ ] Implement `createPost`, `listPosts`
- [ ] Implement `getMetrics`
- [ ] Implement Q&A actions

### Phase 3: Built-in Agents (Week 3)
- [ ] Create `business-analyzer.yaml` built-in agent
- [ ] Create `review-responder.yaml` built-in agent
- [ ] Add documentation and examples

### Phase 4: Testing & Polish
- [ ] Unit tests for all actions
- [ ] Integration tests with real API
- [ ] Rate limiting and error handling
- [ ] Documentation in AGENTS.md

---

## 7. Use Case: Client Review Analysis

### Requirements
- Client has high volume of reviews
- Full admin access available
- Need sentiment analysis and response suggestions

### Proposed Workflow

```
┌─────────────────┐
│  Trigger        │
│  (Manual/Cron)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ google-business │
│ listReviews     │
│ (auto-paginate) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM Analysis    │
│ - Sentiment     │
│ - Themes        │
│ - Urgency       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ LLM Response    │
│ Generator       │
│ (for negatives) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Output          │
│ - Dashboard     │
│ - Sheets        │
│ - Notifications │
└─────────────────┘
```

### Expected Output Structure

```json
{
  "summary": {
    "totalReviews": 1250,
    "averageRating": 4.3,
    "sentimentScore": 7.8,
    "periodCompared": "+0.2 vs last quarter"
  },
  "positiveThemes": [
    {"theme": "Customer Service", "mentions": 342, "sentiment": 0.92},
    {"theme": "Product Quality", "mentions": 287, "sentiment": 0.88}
  ],
  "improvementAreas": [
    {"theme": "Wait Times", "mentions": 89, "sentiment": 0.34},
    {"theme": "Parking", "mentions": 45, "sentiment": 0.41}
  ],
  "urgentResponses": [
    {
      "reviewId": "abc123",
      "rating": 1,
      "comment": "Terrible experience...",
      "suggestedResponse": "We sincerely apologize..."
    }
  ]
}
```

---

## 8. Related Resources

### Documentation
- [Business Profile APIs Overview](https://developers.google.com/my-business/content/overview)
- [Reviews API Reference](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews)
- [Performance API Reference](https://developers.google.com/my-business/reference/performance/rest)

### MCP Servers (for other integrations)
- Notion: `@notionhq/notion-mcp-server`
- GitHub: `@modelcontextprotocol/server-github`
- Slack: `@modelcontextprotocol/server-slack`
- PostgreSQL: `@modelcontextprotocol/server-postgres`

---

## 9. Next Steps

1. **Immediate**: Validate OAuth2 flow with client's Google account
2. **Short-term**: Implement `listReviews` primitive with pagination
3. **Medium-term**: Build complete analyzer workflow
4. **Long-term**: Expand to 100 tool integrations using hybrid strategy

---

## 10. Open Questions

- [ ] What's the approximate review count for the client? (affects pagination strategy)
- [ ] Real-time streaming analysis or batch reports?
- [ ] Auto-reply to reviews or just suggestions?
- [ ] Integration with external dashboards (Sheets, Notion)?
- [ ] Multi-location support needed?

---

*Report generated from Kiro session on December 30, 2025*
