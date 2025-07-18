// Test client for AI Proxy System
// Run with: node test_client.js

const http = require("http");

async function testAIProxy() {
  console.log("Testing AI Proxy System...\n");

  // Test 1: Health check
  console.log("1. Testing health endpoint...");
  try {
    const healthResponse = await makeRequest("/health", "GET");
    console.log("✓ Health check:", healthResponse);
  } catch (error) {
    console.log("✗ Health check failed:", error.message);
  }

  // Test 2: Models endpoint
  console.log("\n2. Testing models endpoint...");
  try {
    const modelsResponse = await makeRequest("/v1/models", "GET");
    console.log("✓ Models:", modelsResponse);
  } catch (error) {
    console.log("✗ Models failed:", error.message);
  }

  // // Test 3: Chat completions with Gemini
  console.log("\n3. Testing chat completions (Gemini)...");
  try {
    const geminiResponse = await makeRequest("/v1/chat/completions", "POST", {
      model: "gemini-pro",
      messages: [
        {
          role: "user",
          content: "Hello! Can you tell me a short joke about developers?",
        },
      ],
    });
    console.log("✓ Gemini response:", geminiResponse);
    console.log("Joke:", geminiResponse.choices[0].message.content);
  } catch (error) {
    console.log("✗ Gemini request failed:", error.message);
  }

  // Test 4: Chat completions with Perplexity
  console.log("\n4. Testing chat completions (Perplexity)...");
  try {
    const perplexityResponse = await makeRequest(
      "/v1/chat/completions",
      "POST",
      {
        model: "perplexity-online",
        messages: [
          {
            role: "user",
            content: "Hello, can you tell me what 20+20 equals?",
          },
        ],
      }
    );
    console.log("✓ Perplexity response:", perplexityResponse);
    console.log("Weather:", perplexityResponse.choices[0].message);
  } catch (error) {
    console.log("✗ Perplexity request failed:", error.message);
  }

  console.log("\nTest completed!");
}

function makeRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(
              new Error(
                `HTTP ${res.statusCode}: ${response.error?.message || body}`
              )
            );
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Run tests
testAIProxy().catch(console.error);
