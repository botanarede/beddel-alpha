
import { Redis } from '@upstash/redis';
import assert from 'assert';

// Centralized test data for each endpoint
const testData = {
  "endpoint_summarize_001": {
    success: { input: { text: "This is a long text to summarize into bullet points." } },
    failure: { input: {} } // Missing 'text'
  },
  "endpoint_extract_entities_002": {
    success: { input: { text: "John Doe works at Google in New York." } },
    failure: { input: {} } // Missing 'text'
  },
  "endpoint_generate_ideas_003": {
    success: { input: { problem: "Our customer support team is overwhelmed with tickets." } },
    failure: { input: {} } // Missing 'problem'
  },
  "endpoint_validate_json_004": {
    success: {
      input: {
        json: '{ \"name\": \"John\", \"age\": 30 }',
        schema: '{ \"type\": \"object\", \"properties\": { \"name\": { \"type\": \"string\" }, \"age\": { \"type\": \"number\" } } }'
      }
    },
    failure: { input: { json: '{ \"name\": \"John\" }' } } // Missing 'schema'
  },
  "endpoint_translate_005": {
    success: { input: { text: "Hello, world!", targetLanguage: "Spanish" } },
    failure: { input: { text: "Hello, world!" } } // Missing 'targetLanguage'
  }
};

// Expected output keys for each endpoint\'s success case
const expectedOutputKeys = {
  endpoint_summarize_001: 'summary',
  endpoint_extract_entities_002: 'entities',
  endpoint_generate_ideas_003: 'ideas',
  endpoint_validate_json_004: 'validation',
  endpoint_translate_005: 'translation'
};


// Mock context object to capture test results
function createMockContext() {
  let output: any = null;
  let error: string | null = null;
  const logs: string[] = [];
  return {
    log: (message: string) => logs.push(message),
    setOutput: (data: any) => { output = data; },
    setError: (message: string) => { error = message; },
    getOutput: () => output,
    getError: () => error,
    getLogs: () => logs,
    reset: () => { output = null; error = null; logs.length = 0; },
  };
}

// Runs the endpoint code in a sandboxed environment
async function runCode(code: string, input: any, props: any, context: any) {
  // Create a dynamic function to execute the user-provided code string
  const execute = new Function('input', 'props', 'context', 'require', `
    const userCode = ${code};
    return userCode(input, props, context);
  `);

  // Execute the code, allowing it to use the real 'require' function
  await execute(input, props, context, require);
}

async function testEndpoints() {
  console.log("[TEST] Starting TRUE integration test...");

  // Check for all required environment variables
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN || !process.env.GEMINI_API_KEY) {
    console.error("[TEST] ❌ Missing required environment variables (KV_REST_API_URL, KV_REST_API_TOKEN, GEMINI_API_KEY).");
    process.exit(1);
  }

  const redis = new Redis({
    url: process.env.KV_REST_API_URL as string,
    token: process.env.KV_REST_API_TOKEN as string,
  });

  const mockContext = createMockContext();
  const endpointIdToTest = process.argv[2];
  let endpointIds: string[] = [];

  if (endpointIdToTest) {
    console.log(`[TEST] 🎯 Targeting single endpoint: ${endpointIdToTest}`);
    endpointIds = [endpointIdToTest];
  } else {
    console.log("[TEST] 🎯 Targeting all endpoints from master list...");
    const idList = await redis.get<string[]>('endpoints:list');
    if (!idList) {
      console.error("[TEST] ❌ Master list 'endpoints:list' not found in Redis.");
      process.exit(1);
    }
    endpointIds = idList;
  }

  if (endpointIds.length === 0) {
    console.warn("[TEST] ⚠️ No endpoints found to test.");
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const endpointId of endpointIds) {
    const key = `endpoint:${endpointId}`;
    const endpoint = await redis.get<any>(key);

    if (!endpoint || !endpoint.code || !endpoint.id) {
      console.warn(`[TEST] ⚠️ Skipping invalid record for ID: ${endpointId} (key: ${key})`);
      continue;
    }

    const specificTestData = testData[endpointId as keyof typeof testData];
    const expectedKey = expectedOutputKeys[endpointId as keyof typeof expectedOutputKeys];

    if (!specificTestData || !expectedKey) {
      console.warn(`[TEST] ⚠️ No test data or expected output key for ${endpointId}. Skipping.`);
      continue;
    }

    console.log(`\n[TEST] 🧪 Testing endpoint: ${endpoint.name} (${endpointId})`);
    mockContext.reset();

    try {
      const realProps = { gemini_api_key: process.env.GEMINI_API_KEY };

      // Test Case 1: Success (Real API Call)
      console.log("  -> Running success case (REAL API call)...");
      await runCode(endpoint.code, specificTestData.success.input, realProps, mockContext);
      const output = mockContext.getOutput();
      assert.strictEqual(mockContext.getError(), null, "Success case should not produce an error.");
      assert.ok(output, "Output should not be null or undefined.");
      assert.ok(output[expectedKey], `Output should have the key '${expectedKey}'.`);
      assert.strictEqual(typeof output[expectedKey], 'string', `Value of '${expectedKey}' should be a string.`);
      console.log(`     ✅ Success (Received: "${output[expectedKey].substring(0, 50)}...")`);

      // Test Case 2: Failure (missing input)
      console.log("  -> Running failure case (missing input)...");
      mockContext.reset();
      await runCode(endpoint.code, specificTestData.failure.input, realProps, mockContext);
      assert.notStrictEqual(mockContext.getError(), null, "Failure case (missing input) should produce an error.");
      console.log("     ✅ Success (Correctly caught error)");

      // Test Case 3: Failure (missing prop)
      console.log("  -> Running failure case (missing prop)...");
      mockContext.reset();
      await runCode(endpoint.code, specificTestData.success.input, {}, mockContext);
      assert.notStrictEqual(mockContext.getError(), null, "Failure case (missing prop) 2should produce an error.");
      console.log("     ✅ Success (Correctly caught error)");

      passed++;
    } catch (e: any) {
      console.error(`[TEST] ❌ FAILED: ${endpoint.name}`);
      console.error(`     Assertion Error: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n[TEST] ✨ Test run complete.`);
  console.log(`[TEST] Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

testEndpoints();
