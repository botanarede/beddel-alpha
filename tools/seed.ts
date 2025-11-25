// centralized seed file to update existing methods using Upstash KV
//
// how to run:
// 1. make sure your environment variables for KV_REST_API_URL and KV_REST_API_TOKEN are set
// 2. run the following command from the root of the project:
//    npx dotenv-cli -- npx tsx packages/beddel/tools/seed.ts

import { Redis } from "@upstash/redis";

// --- Code block for: summarize-text ---
const summarizeTextCode = `async function execute(input, props, context) {
      try {
        context.log("Starting text summarization...");
        const { generateText } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        if (!input.text) {
          return context.setError("Missing required parameter: text");
        }

        if (!props.gemini_api_key) {
          return context.setError("Missing required prop: gemini_api_key");
        }

        const google = createGoogleGenerativeAI({
          apiKey: props.gemini_api_key,
        });

        const { text } = await generateText({
          model: google("models/gemini-flash-latest"),
          prompt: "Summarize the following text into concise bullet points:\\n\\n" + input.text,
        });

        if (typeof text !== "string") {
          return context.setError("AI service did not return a valid text response.");
        }

        context.log("Successfully generated summary.");
        context.setOutput({ summary: text });

      } catch (e) {
        context.log("An unexpected error occurred: " + e.message);
        context.setError(e.message || "An unknown error occurred during summarization.");
      }
    }`;

// --- Code block for: extract-entities ---
const extractEntitiesCode = `async function execute(input, props, context) {
      try {
        context.log("Starting entity extraction...");
        const { generateText } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        if (!input.text) {
          return context.setError("Missing required parameter: text");
        }

        if (!props.gemini_api_key) {
          return context.setError("Missing required prop: gemini_api_key");
        }

        const google = createGoogleGenerativeAI({
          apiKey: props.gemini_api_key,
        });

        const { text } = await generateText({
          model: google("models/gemini-flash-latest"),
          prompt: "Extract all named entities from the following text and categorize them as PERSON, PLACE, ORGANIZATION, or OTHER. Return as a valid JSON object string:\\n\\n" + input.text,
        });

        if (typeof text !== "string") {
          return context.setError("AI service did not return a valid text response.");
        }

        context.log("Successfully extracted entities.");
        context.setOutput({ entities: text });

      } catch (e) {
        context.log("An unexpected error occurred: " + e.message);
        context.setError(e.message || "An unknown error occurred during entity extraction.");
      }
    }`;
    
// --- Code block for: generate-automation-ideas ---
const generateIdeasCode = `async function execute(input, props, context) {
      try {
        context.log("Starting automation idea generation...");
        const { generateText } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        if (!input.problem) {
          return context.setError("Missing required parameter: problem");
        }

        if (!props.gemini_api_key) {
          return context.setError("Missing required prop: gemini_api_key");
        }

        const google = createGoogleGenerativeAI({
          apiKey: props.gemini_api_key,
        });

        const { text } = await generateText({
          model: google("models/gemini-flash-latest"),
          prompt: "Given this business problem: "" + input.problem + ""\\n\\nGenerate 5 creative automation workflow ideas that could solve or improve this situation. For each idea, include: 1) Workflow name, 2) Description, 3) Key steps, 4) Expected benefits.",
        });

        if (typeof text !== "string") {
          return context.setError("AI service did not return a valid text response.");
        }

        context.log("Successfully generated ideas.");
        context.setOutput({ ideas: text });

      } catch (e) {
        context.log("An unexpected error occurred: " + e.message);
        context.setError(e.message || "An unknown error occurred during idea generation.");
      }
    }`;

// --- Code block for: validate-json-schema ---
const validateJsonCode = `async function execute(input, props, context) {
      try {
        context.log("Starting JSON validation...");
        const { generateText } = await import("ai");
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");

        if (!input.json || !input.schema) {
          return context.setError("Missing required parameters: json, schema");
        }

        if (!props.gemini_api_key) {
          return context.setError("Missing required prop: gemini_api_key");
        }

        const google = createGoogleGenerativeAI({
          apiKey: props.gemini_api_key,
        });

        const { text } = await generateText({
          model: google("models/gemini-flash-latest"),
          prompt: "Validate this JSON data against the schema and provide detailed feedback:\\n\\nJSON Data:\\n" + input.json + "\\n\\nSchema:\\n" + input.schema + "\\n\\nProvide: 1) Is it valid? 2) List of errors if any, 3) Suggested fixes",
        });

        if (typeof text !== "string") {
          return context.setError("AI service did not return a valid text response.");
        }

        context.log("Successfully validated JSON.");
        context.setOutput({ validation: text });

      } catch (e) {
        context.log("An unexpected error occurred: " + e.message);
        context.setError(e.message || "An unknown error occurred during JSON validation.");
      }
    }`;

// --- Code block for: create-endpoint-from-description ---
const createEndpointFromDescriptionCode = `async function execute(input, props, context) {
      const { generateText } = await import("ai");
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      const { Redis } = await import("@upstash/redis");

      try {
        context.log("Starting endpoint generation from description...");

        // 1. Validate input and props
        if (!input.description) {
          return context.setError("Missing required parameter: description");
        }
        const requiredPropsList = ["gemini_api_key", "kv_rest_api_url", "kv_rest_api_token"];
        for (const prop of requiredPropsList) {
          if (!props[prop]) {
            return context.setError("Missing required prop: " + prop);
          }
        }

        // 1.5. Fetch existing endpoints to inform AI
        const redis = new Redis({
          url: props.kv_rest_api_url,
          token: props.kv_rest_api_token,
        });

        context.log("Fetching existing endpoints to inform AI...");
        const existingEndpointIds = (await redis.get("endpoints:list")) || [];
        const existingEndpoints = [];
        for (const id of existingEndpointIds) {
          const endpoint = await redis.get("endpoint:" + id);
          if (endpoint) {
            existingEndpoints.push({
              id: endpoint.id,
              name: endpoint.name,
              description: endpoint.description,
              requiredProps: endpoint.requiredProps,
            });
          }
        }
        const existingEndpointsString = JSON.stringify(existingEndpoints, null, 2);
        context.log("Found " + existingEndpoints.length + " existing endpoints.");

        // 2. Prepare the prompt for the AI
        const generationPrompt = "# PROMPT PARA GERAÇÃO DE ENDPOINT DINÂMICO COM IA\\n\\n" +
          "## Persona\\nVocê é um Engenheiro de Software Sênior especialista em criar funções serverless seguras, eficientes e robustas em JavaScript.\\n\\n" +
          "## Contexto da Aplicação\\nVocê está trabalhing in um sistema que executa dinamicamente endpoints de código a partir de uma base de dados Upstash KV. Cada endpoint é uma função \\"execute\\" que recebe \\"input\\", \\"props\\", e \\"context\\".\\n- \\"context.setOutput(output)\\" para sucesso.\\n- \\"context.setError(error)\\" para falha.\\n\\n" +
          "## Exemplo de Implementação Correta\\n**Descrição:** \"Resumir texto com Gemini.\"\\n**Saída JSON Esperada:**\\n" +
          "{\\n  \"name\": \"summarize-text\",\\n  \"description\": \"Summarize long text into concise bullet points using Gemini AI\",\\n  \"requiredProps\": [\"gemini_api_key\"],\\n  \"code\": \"async function execute(input, props, context) { try { context.log(\\"Starting text summarization...\\"); const { generateText } = await import(\\"ai\\"); const { createGoogleGenerativeAI } = await import(\\"/@ai-sdk/google\\"); if (!input.text) { return context.setError(\\"Missing required parameter: text\\"); } if (!props.gemini_api_key) { return context.setError(\\"Missing required prop: gemini_api_key\\"); } const google = createGoogleGenerativeAI({ apiKey: props.gemini_api_key }); const { text } = await generateText({ model: google(\\"models/gemini-flash-latest\\"), prompt: \\"Summarize the following text into concise bullet points:\\\\\\\\n\\\\\\\\n\\" + input.text }); if (typeof text !== \\"string\\") { return context.setError(\\"AI service did not return a valid text response.\\"); } context.log(\\"Successfully generated summary.\\"); context.setOutput({ summary: text }); } catch (e) { context.log(\\"An unexpected error occurred: \\" + e.message); context.setError(e.message || \\"An unknown error occurred during summarization.\\"); } }"\\n}" +
          "\\n\\n## Endpoints Existentes (para referência e reutilização de padrões)\\n\\`\\`\\`json\\n" + existingEndpointsString + "\\n\\`\\`\\`\\n\\n" +
          "## Regras\\n1.  **Segurança:** Valide \\"input\\" e \\"props\\".\\n2.  **Saída JSON:** Sua resposta DEVE ser um único objeto JSON válido. O campo \\"code\\" deve ser uma string com quebras de linha escapadas como \\"\\\\n\\".\\n3.  **Bibliotecas Permitidas:** \\"ai\\", \\"@ai-sdk/google\\", \\"@upstash/redis\\".\\n4.  **Nome do Endpoint:** O \\"name\\" deve ser um slug em \\"kebab-case\\".\\n5.  **Reutilização:** Se um endpoint similar já existe, o novo endpoint DEVE tentar reutilizar lógica ou ao menos seguir o mesmo padrão de design e validação.\\n\\n" +
          '## Sua Tarefa\\nGere o objeto JSON para o novo endpoint.\\n**Descrição do Usuário:** "" + input.description + """;

        // 3. Call the AI to generate the endpoint details
        context.log('Generating endpoint code with AI...');
        const google = createGoogleGenerativeAI({ apiKey: props.gemini_api_key });
        const { text } = await generateText({
          model: google('models/gemini-flash-latest'),
          prompt: generationPrompt,
        });

        let newEndpoint;
        try {
          newEndpoint = JSON.parse(text);
        } catch (e) {
          context.log('AI returned invalid JSON: ' + text);
          return context.setError('Failed to parse AI response. The generated content was not valid JSON.');
        }

        // 4. Connect to Upstash KV and save the new endpoint
        context.log('Connecting to Upstash KV to save \"' + newEndpoint.name + '\"...');
        
        const endpointId = 'endpoint_' + newEndpoint.name.replace(/-/g, '_') + '_' + Date.now();
        const endpointData = {
          id: endpointId,
          name: newEndpoint.name,
          description: newEndpoint.description,
          code: newEndpoint.code,
          requiredProps: newEndpoint.requiredProps || [],
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await redis.set('endpoint:' + endpointId, JSON.stringify(endpointData));
        context.log('Successfully saved new endpoint.');

        // 5. Update the main endpoint list
        const endpointList = (await redis.get('endpoints:list')) || [];
        if (!Array.isArray(endpointList)) {
            await redis.set('endpoints:list', [endpointId]);
        } else {
            endpointList.push(endpointId);
            await redis.set('endpoints:list', endpointList);
        }
        
        context.log('Successfully updated endpoints list.');

        context.setOutput({
          message: 'Endpoint created successfully!',
          endpointId: endpointId,
          name: newEndpoint.name
        });

      } catch (e) {
        context.log('An unexpected error occurred: ' + e.message);
        context.setError(e.message || 'An unknown error occurred during endpoint creation.');
      }
    }`;

// The list of methods to be updated with the correct code pattern.
const methodsToUpdate = [
  {
    id: "endpoint_summarize_001",
    name: "summarize-text",
    description: "Summarize long text into concise bullet points using Gemini AI",
    isPublic: true,
    requiredProps: ["gemini_api_key"],
    code: summarizeTextCode,
  },
  {
    id: "endpoint_extract_entities_002",
    name: "extract-entities",
    description: "Extract named entities (people, places, organizations) from text",
    isPublic: true,
    requiredProps: ["gemini_api_key"],
    code: extractEntitiesCode,
  },
  {
    id: "endpoint_generate_ideas_003",
    name: "generate-automation-ideas",
    description: "Generate automation workflow ideas based on a business problem",
    isPublic: true,
    requiredProps: ["gemini_api_key"],
    code: generateIdeasCode,
  },
  {
    id: "endpoint_validate_json_004",
    name: "validate-json-schema",
    description: "Validate JSON data against a schema and suggest fixes",
    isPublic: true,
    requiredProps: ["gemini_api_key"],
    code: validateJsonCode,
  },
  {
    id: "endpoint_create_from_description_005",
    name: "create-endpoint-from-description",
    description: "Create a new dynamic endpoint from a natural language description using AI",
    isPublic: false,
    requiredProps: ["gemini_api_key", "kv_rest_api_url", "kv_rest_api_token"],
    code: createEndpointFromDescriptionCode,
  },
];

async function seedUpdatedMethods() {
  console.log("[v1] Starting endpoint update seed...");

  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error("[v1] ❌ Missing Upstash KV environment variables. Please set KV_REST_API_URL and KV_REST_API_TOKEN.");
    process.exit(1);
  }

  console.log("[v1] Connecting to Upstash KV...");
  const redis = new Redis({
    url: process.env.KV_REST_API_URL as string,
    token: process.env.KV_REST_API_TOKEN as string,
  });

  try {
    const allEndpointIds = [];
    for (const method of methodsToUpdate) {
      console.log(`[v1] Updating endpoint: ${method.name} (${method.id})`);
      
      const oldRecord = await redis.get<any>(`endpoint:${method.id}`);
      const createdAt = oldRecord?.createdAt || new Date().toISOString();

      const updatedMethod = {
        ...oldRecord,
        ...method,
        createdAt: createdAt,
        updatedAt: new Date().toISOString(),
      };
      
      await redis.set(`endpoint:${method.id}`, JSON.stringify(updatedMethod));
      console.log(`[v1] ✓ Successfully updated ${method.name}`);
      allEndpointIds.push(method.id);
    }

    // Check for endpoints that are in the list but not in methodsToUpdate
    const existingEndpointIds = (await redis.get<string[]>("endpoints:list")) || [];
    for(const existingId of existingEndpointIds) {
        if(!allEndpointIds.includes(existingId)) {
            allEndpointIds.push(existingId)
        }
    }
    
    await redis.set("endpoints:list", allEndpointIds);
    console.log("[v1] ✓ Successfully created/updated the endpoints list index.");

    console.log("\\n[v1] ✅ Endpoint update seed completed successfully!");

  } catch (error) {
    console.error("\\n[v1] ❌ Error updating endpoints:", error);
    throw error;
  }
}

seedUpdatedMethods();
