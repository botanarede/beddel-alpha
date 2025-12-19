"use strict";
/**
 * GraphQL helpers used by the /api/graphql route.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraphQLSchema = getGraphQLSchema;
exports.executeRegisteredMethod = executeRegisteredMethod;
exports.handleGraphQLPost = handleGraphQLPost;
exports.handleGraphQLGet = handleGraphQLGet;
const graphql_1 = require("graphql");
const graphql_yoga_1 = require("graphql-yoga");
const agentRegistry_1 = require("../../agents/agentRegistry");
const kvStore_1 = require("../kvStore");
const runtimeSecurity_1 = require("../runtimeSecurity");
const errors_1 = require("../errors");
const schema = `
  type Query { ping: String! }
  type Mutation { executeMethod(methodName: String!, params: JSON!, props: JSON!): ExecutionResult! }
  type ExecutionResult { success: Boolean!, data: JSON, error: String, executionTime: Int! }
  scalar JSON
`;
function getGraphQLSchema() {
    return schema;
}
const parseJsonLiteral = (ast) => {
    switch (ast.kind) {
        case graphql_1.Kind.STRING:
        case graphql_1.Kind.BOOLEAN:
            return ast.value;
        case graphql_1.Kind.INT:
            return parseInt(ast.value, 10);
        case graphql_1.Kind.FLOAT:
            return parseFloat(ast.value);
        case graphql_1.Kind.OBJECT: {
            const value = {};
            for (const field of ast.fields) {
                value[field.name.value] = parseJsonLiteral(field.value);
            }
            return value;
        }
        case graphql_1.Kind.LIST:
            return ast.values.map(parseJsonLiteral);
        case graphql_1.Kind.NULL:
            return null;
        default:
            return null;
    }
};
const jsonScalar = new graphql_1.GraphQLScalarType({
    name: "JSON",
    description: "Arbitrary JSON value",
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => parseJsonLiteral(ast),
});
async function executeRegisteredMethod(input, clientId) {
    const startTime = Date.now();
    const context = {
        logs: [],
        status: "running",
        output: undefined,
        error: undefined,
        log: (message) => context.logs.push(`[${new Date().toISOString()}] ${message}`),
        setOutput: (output) => {
            context.output = output;
            context.status = "success";
        },
        setError: (error) => {
            context.error = error;
            context.status = "error";
        },
    };
    try {
        context.log("Method execution initiated.");
        if (!(0, runtimeSecurity_1.isValidMethodName)(input.methodName)) {
            throw new errors_1.ValidationError("Invalid method name format");
        }
        const declarativeAgent = agentRegistry_1.agentRegistry.getAgent(input.methodName);
        if (declarativeAgent) {
            context.log(`Found declarative agent: ${input.methodName}`);
            const result = await agentRegistry_1.agentRegistry.executeAgent(input.methodName, (0, runtimeSecurity_1.sanitizeInput)(input.params), (0, runtimeSecurity_1.sanitizeInput)(input.props), context);
            const executionTime = Date.now() - startTime;
            await (0, kvStore_1.logExecution)({
                id: `log_${Date.now()}`,
                clientId,
                endpointName: input.methodName,
                timestamp: new Date().toISOString(),
                duration: executionTime,
                success: true,
                input: input.params,
                output: result,
                logs: context.logs,
            });
            return { success: true, data: result, executionTime };
        }
        const endpoint = await (0, kvStore_1.getEndpointByName)(input.methodName);
        if (!endpoint) {
            throw new errors_1.NotFoundError(`Method '${input.methodName}' not found`);
        }
        context.log(`Found endpoint: ${endpoint.name}`);
        const sanitizedParams = (0, runtimeSecurity_1.sanitizeInput)(input.params);
        const sanitizedProps = (0, runtimeSecurity_1.sanitizeInput)(input.props);
        const { valid, missing } = (0, runtimeSecurity_1.validateRequiredProps)(endpoint.requiredProps, sanitizedProps);
        if (!valid) {
            throw new errors_1.ValidationError(`Missing required props: ${missing.join(", ")}`);
        }
        context.log("Props validated. Executing sandbox.");
        await (0, runtimeSecurity_1.executeInSandbox)(endpoint.code, sanitizedParams, sanitizedProps, context);
        context.log("Sandbox execution finished.");
        if (context.status === "error") {
            throw new Error(context.error || "Sandbox execution failed.");
        }
        if (context.status !== "success") {
            throw new Error("Sandbox finished in an indeterminate state.");
        }
        const executionTime = Date.now() - startTime;
        await (0, kvStore_1.logExecution)({
            id: `log_${Date.now()}`,
            clientId,
            endpointName: input.methodName,
            timestamp: new Date().toISOString(),
            duration: executionTime,
            success: true,
            input: sanitizedParams,
            output: context.output,
            logs: context.logs,
        });
        return { success: true, data: context.output, executionTime };
    }
    catch (error) {
        const executionTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (!context.error)
            context.setError(errorMessage);
        await (0, kvStore_1.logExecution)({
            id: `log_${Date.now()}`,
            clientId,
            endpointName: input.methodName,
            timestamp: new Date().toISOString(),
            duration: executionTime,
            success: false,
            error: errorMessage,
            input: input.params,
            logs: context.logs,
        });
        return { success: false, error: errorMessage, executionTime };
    }
}
async function resolveClientId(request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const apiKey = authHeader.substring(7);
        if (!(0, runtimeSecurity_1.isValidApiKey)(apiKey)) {
            throw new errors_1.AuthenticationError("Invalid API key format");
        }
        const client = await (0, kvStore_1.getClientByApiKey)(apiKey);
        if (!client)
            throw new errors_1.AuthenticationError("Invalid API key");
        const rateLimitOk = await (0, kvStore_1.checkRateLimit)(client.id, client.rateLimit);
        if (!rateLimitOk)
            throw new errors_1.RateLimitError("Rate limit exceeded.");
        return client.id;
    }
    if (request.headers.get("x-admin-tenant") === "true") {
        return "admin_tenant";
    }
    throw new errors_1.AuthenticationError("Missing or invalid authorization header");
}
function toGraphQLError(error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let code = "INTERNAL_SERVER_ERROR";
    if (error instanceof errors_1.AuthenticationError) {
        code = "UNAUTHENTICATED";
    }
    else if (error instanceof errors_1.RateLimitError) {
        code = "RATE_LIMITED";
    }
    else if (error instanceof errors_1.ValidationError) {
        code = "BAD_USER_INPUT";
    }
    else if (error instanceof errors_1.NotFoundError) {
        code = "NOT_FOUND";
    }
    return new graphql_1.GraphQLError(message, { extensions: { code } });
}
const yoga = (0, graphql_yoga_1.createYoga)({
    schema: (0, graphql_yoga_1.createSchema)({
        typeDefs: schema,
        resolvers: {
            JSON: jsonScalar,
            Query: {
                ping: () => "pong",
            },
            Mutation: {
                executeMethod: async (_parent, args, context) => {
                    try {
                        const clientId = await resolveClientId(context.request);
                        return await executeRegisteredMethod({
                            methodName: args.methodName,
                            params: args.params || {},
                            props: args.props || {},
                        }, clientId);
                    }
                    catch (error) {
                        throw toGraphQLError(error);
                    }
                },
            },
        },
    }),
    context: ({ request }) => ({ request }),
    graphqlEndpoint: "/api/graphql",
    graphiql: true,
    fetchAPI: { Request, Response },
});
async function handleGraphQLPost(request) {
    return yoga.handleRequest(request, {});
}
async function handleGraphQLGet(request) {
    return yoga.handleRequest(request, {});
}
//# sourceMappingURL=graphql.js.map