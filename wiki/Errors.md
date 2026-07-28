<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Errors&amp;subtitle=Learn+how+to+handle+exceptions+in+Linkdirecte.&amp;logo=lu%3ACircleX&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Errors | Learn how to handle exceptions in Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Errors&amp;subtitle=Learn+how+to+handle+exceptions+in+Linkdirecte.&amp;logo=lu%3AAlertTriangle&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

Linkdirecte provides a comprehensive, granular, and type-safe error taxonomy designed to make debugging simple. All custom errors inherit from the base class `EdError`, ensuring that you can catch all SDK-related exceptions cleanly.

---

## 🏛️ Error Taxonomy

The SDK implements the following hierarchical error classes:

- **`EdError`**: The base error class. Every exception thrown by Linkdirecte is an instance of `EdError`.
  - **`EdAuthError`**: Thrown during login, 2FA validation, or session refresh failures.
  - **`EdApiError`**: Thrown when EcoleDirecte returns an error code or an unexpected response status.
    - **`EdValidationError`**: Thrown during client-side argument and option validation (e.g., passing empty parameters, invalid bounds).
  - **`EdNetworkError`**: Thrown when physical connection issues occur.
    - **`EdServerError`**: Thrown when EcoleDirecte returns an HTTP status code indicating a server-side error (HTTP >= 500).
      - **`EdParseError`**: Thrown when the SDK fails to parse an EcoleDirecte response payload as JSON.
    - **`EdTimeoutError`**: Thrown when an API request times out.
  - **`EdRateLimitError`**: Thrown when the user exceeds request rate limits (HTTP 429).
  - **`EdTransformError`**: Thrown during internal transformation or Base64 decoding issues.

---

## 🗂️ Error Properties

All errors produced by the SDK feature standard properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | The exact class name of the error (e.g., `"EdTimeoutError"`). Preserved from minification. |
| `message` | `string` | Human-readable message, formatted with the code prefix and status suffix. |
| `code` | `string` | A unique string/integer identifier (e.g., `"TIMEOUT_ERROR"`, `"505"`, `"INVALID_ARGUMENT"`). |
| `statusCode` | `number \| undefined` | The associated HTTP status code, if applicable. |
| `raw` | `unknown \| undefined` | The raw API response payload or original exception source. (Omitted from default `toJSON()` serialization). |
| `stack` | `string \| undefined` | Optional, non-standard error stack trace. |

---

## 📝 Usage & Catching Examples

### Catching Specific Errors

You can use standard JavaScript/TypeScript `instanceof` checks to handle errors dynamically:

```typescript
import { login, getGrades, EdTimeoutError, EdAuthError, EdError } from "@scolup/linkdirecte";

try {
  await login("my_username", "my_password");
  const grades = await getGrades();
} catch (error) {
  if (error instanceof EdAuthError) {
    console.error("Authentication issue:", error.message);
  } else if (error instanceof EdTimeoutError) {
    console.warn("The server took too long to respond. Retrying...");
  } else if (error instanceof EdError) {
    console.error(`SDK Error [${error.code}]:`, error.message);
  } else {
    console.error("Unknown error:", error);
  }
}
```

### Serializing to JSON

The `toJSON()` helper on `EdError` is extremely helpful when logging to external telemetry, monitoring tools, or serializing logs:

```typescript
try {
  await getGrades();
} catch (error) {
  if (error instanceof EdError) {
    console.log(JSON.stringify(error.toJSON(), null, 2));
  }
}
```

**JSON Output Example:**
```json
{
  "name": "EdTimeoutError",
  "message": "[TIMEOUT_ERROR] Request to https://api.ecoledirecte.com/v3/notes.awp?v=7.14.3 timed out after 15000ms",
  "code": "TIMEOUT_ERROR",
  "statusCode": 0,
  "stack": "EdTimeoutError: [TIMEOUT_ERROR] Request to... at sendRequest ..."
}
```

---

## 🗺️ Raw API Code Mapping

EcoleDirecte API relies on numeric response codes. The SDK automatically maps these cryptic response codes into descriptive, friendly error messages to save you time:

| Raw Code | Status | Friendly Description mapped by SDK |
| :--- | :--- | :--- |
| `250` | Double Auth Required | Two-factor authentication required |
| `505` | Invalid Credentials | Invalid username or password |
| `520` | Token Invalid | Session expired: Invalid session token |
| `521` | Re-login Required | Session expired: Re-login required |
| `522` | Bad Signature | Invalid headers or signature |
| `525` | Missing/Invalid Token | Session expired: Token is missing or invalid |
