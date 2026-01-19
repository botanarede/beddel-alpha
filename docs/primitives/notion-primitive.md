# Notion Primitive

> **Status**: Implemented  
> **Type**: Native Primitive  
> **Environment Variable**: `NOTION_TOKEN`

---

## Overview

The Notion primitive provides direct integration with the Notion API, enabling workflows to manage pages, databases, blocks, and perform searches within a Notion workspace.

---

## Setup

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Click "New integration"
3. Give it a name and select the workspace
4. Copy the "Internal Integration Secret" (starts with `ntn_`)

### 2. Connect Pages to Integration

1. Open the Notion page/database you want to access
2. Click the `...` menu → "Connect to" → Select your integration
3. Or use the Integration's "Access" tab to grant access to specific pages

### 3. Set Environment Variable

```bash
NOTION_TOKEN=ntn_your_integration_secret_here
```

---

## Supported Actions

| Action | Description | Required Config |
|--------|-------------|-----------------|
| `search` | Search pages and databases | `query?`, `filter?` |
| `getPage` | Retrieve a page by ID | `pageId` |
| `createPage` | Create a new page | `parent`, `properties` |
| `updatePage` | Update page properties | `pageId`, `properties?` |
| `getDatabase` | Retrieve database schema | `databaseId` |
| `queryDatabase` | Query database with filters | `databaseId`, `filter?`, `sorts?` |
| `getBlocks` | Get block children | `blockId` or `pageId` |
| `appendBlocks` | Append blocks to page/block | `blockId` or `pageId`, `children` |
| `createDatabase` | Create a new database | `parent`, `properties`, `title?` |

---

## YAML Examples

### Search for Pages

```yaml
- id: "search-pages"
  type: "notion"
  config:
    action: "search"
    query: "Meeting Notes"
    filter:
      property: "object"
      value: "page"
    pageSize: 10
  result: "searchResults"
```

### Get a Page

```yaml
- id: "get-page"
  type: "notion"
  config:
    action: "getPage"
    pageId: "$input.pageId"
  result: "pageData"
```

### Create a Page in Database

```yaml
- id: "create-task"
  type: "notion"
  config:
    action: "createPage"
    parent:
      type: "database_id"
      database_id: "abc123..."
    properties:
      Name:
        title:
          - text:
              content: "New Task from Beddel"
      Status:
        select:
          name: "To Do"
      Priority:
        select:
          name: "High"
    children:
      - object: "block"
        type: "paragraph"
        paragraph:
          rich_text:
            - type: "text"
              text:
                content: "This task was created automatically."
  result: "newPage"
```

### Query Database with Filters

```yaml
- id: "query-tasks"
  type: "notion"
  config:
    action: "queryDatabase"
    databaseId: "$input.databaseId"
    filter:
      and:
        - property: "Status"
          select:
            equals: "In Progress"
        - property: "Assignee"
          people:
            contains: "$input.userId"
    sorts:
      - property: "Due Date"
        direction: "ascending"
    pageSize: 50
  result: "tasks"
```

### Append Content to Page

```yaml
- id: "add-content"
  type: "notion"
  config:
    action: "appendBlocks"
    pageId: "$input.pageId"
    children:
      - object: "block"
        type: "heading_2"
        heading_2:
          rich_text:
            - type: "text"
              text:
                content: "AI Analysis Results"
      - object: "block"
        type: "paragraph"
        paragraph:
          rich_text:
            - type: "text"
              text:
                content: "$stepResult.analysis.summary"
  result: "appendedBlocks"
```

### Create a Database

```yaml
- id: "create-db"
  type: "notion"
  config:
    action: "createDatabase"
    parent:
      type: "page_id"
      page_id: "$input.parentPageId"
    title:
      - type: "text"
        text:
          content: "Project Tasks"
    properties:
      Name:
        title: {}
      Status:
        select:
          options:
            - name: "To Do"
              color: "gray"
            - name: "In Progress"
              color: "blue"
            - name: "Done"
              color: "green"
      Priority:
        select:
          options:
            - name: "Low"
              color: "gray"
            - name: "Medium"
              color: "yellow"
            - name: "High"
              color: "red"
      Due Date:
        date: {}
  result: "newDatabase"
```

---

## Complete Workflow Example

```yaml
metadata:
  name: "Notion Task Manager"
  version: "1.0.0"

workflow:
  # Step 1: Query pending tasks
  - id: "get-pending"
    type: "notion"
    config:
      action: "queryDatabase"
      databaseId: "$input.databaseId"
      filter:
        property: "Status"
        select:
          equals: "To Do"
    result: "pendingTasks"

  # Step 2: Analyze with AI
  - id: "analyze"
    type: "llm"
    config:
      provider: "google"
      model: "gemini-2.0-flash-exp"
      system: |
        Analyze these tasks and suggest:
        1. Priority order
        2. Time estimates
        3. Dependencies between tasks
      messages:
        - role: "user"
          content: |
            Tasks: $stepResult.pendingTasks.results
    result: "analysis"

  # Step 3: Create summary page
  - id: "create-summary"
    type: "notion"
    config:
      action: "createPage"
      parent:
        type: "page_id"
        page_id: "$input.summaryPageId"
      properties:
        title:
          title:
            - text:
                content: "Task Analysis - $input.date"
      children:
        - object: "block"
          type: "heading_1"
          heading_1:
            rich_text:
              - type: "text"
                text:
                  content: "AI Task Analysis"
        - object: "block"
          type: "paragraph"
          paragraph:
            rich_text:
              - type: "text"
                text:
                  content: "$stepResult.analysis.text"
    result: "summaryPage"
```

---

## Response Structure

### Successful Response

```json
{
  "success": true,
  "action": "queryDatabase",
  "data": { /* full API response */ },
  "results": [ /* array of pages/blocks */ ],
  "nextCursor": "abc123...",
  "hasMore": true
}
```

### Error Response

```json
{
  "success": false,
  "action": "queryDatabase",
  "error": "Notion API error (404): Could not find database with ID: xyz"
}
```

---

## Pagination

For actions that return lists (`search`, `queryDatabase`, `getBlocks`), use pagination:

```yaml
- id: "first-page"
  type: "notion"
  config:
    action: "queryDatabase"
    databaseId: "abc123"
    pageSize: 100
  result: "page1"

- id: "second-page"
  type: "notion"
  config:
    action: "queryDatabase"
    databaseId: "abc123"
    pageSize: 100
    startCursor: "$stepResult.page1.nextCursor"
  result: "page2"
```

---

## Property Types Reference

### Title Property
```yaml
properties:
  Name:
    title:
      - text:
          content: "Page Title"
```

### Rich Text Property
```yaml
properties:
  Description:
    rich_text:
      - text:
          content: "Some description"
```

### Select Property
```yaml
properties:
  Status:
    select:
      name: "In Progress"
```

### Multi-Select Property
```yaml
properties:
  Tags:
    multi_select:
      - name: "Tag1"
      - name: "Tag2"
```

### Number Property
```yaml
properties:
  Price:
    number: 99.99
```

### Checkbox Property
```yaml
properties:
  Done:
    checkbox: true
```

### Date Property
```yaml
properties:
  Due:
    date:
      start: "2025-01-15"
      end: "2025-01-20"
```

### URL Property
```yaml
properties:
  Link:
    url: "https://example.com"
```

---

## Block Types Reference

### Paragraph
```yaml
- object: "block"
  type: "paragraph"
  paragraph:
    rich_text:
      - type: "text"
        text:
          content: "Paragraph text"
```

### Headings
```yaml
- object: "block"
  type: "heading_1"  # or heading_2, heading_3
  heading_1:
    rich_text:
      - type: "text"
        text:
          content: "Heading"
```

### Bulleted List
```yaml
- object: "block"
  type: "bulleted_list_item"
  bulleted_list_item:
    rich_text:
      - type: "text"
        text:
          content: "List item"
```

### To-Do
```yaml
- object: "block"
  type: "to_do"
  to_do:
    rich_text:
      - type: "text"
        text:
          content: "Task item"
    checked: false
```

### Code Block
```yaml
- object: "block"
  type: "code"
  code:
    rich_text:
      - type: "text"
        text:
          content: "console.log('Hello')"
    language: "javascript"
```

---

## Related Resources

- [Notion API Reference](https://developers.notion.com/reference)
- [Notion Integration Guide](https://developers.notion.com/docs/getting-started)
- [Property Types](https://developers.notion.com/reference/property-object)
- [Block Types](https://developers.notion.com/reference/block)
