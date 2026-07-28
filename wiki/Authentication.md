<p align="center">
  <picture><source media="(prefers-color-scheme: light)" srcset="https://shieldcn.dev/header/glow.svg?title=Auth+and+sessions&amp;subtitle=Learn+how+to+login+with+Linkdirecte.&amp;logo=lu%3AKey&amp;mode=light&amp;theme=blue&amp;align=left" /><img alt="Auth and sessions | Learn how to login with Linkdirecte." src="https://shieldcn.dev/header/glow.svg?title=Auth+and+sessions&amp;subtitle=Learn+how+to+login+with+Linkdirecte.&amp;logo=lu%3AKey&amp;mode=dark&amp;theme=blue&amp;align=left" /></picture>
</p>

The authentication module is the gateway to Linkdirecte. It manages everything related to connecting to EcoleDirecte's servers, handling Two-Factor Authentication (2FA), saving session cookies secretly, and auto-refreshing expired tokens.

---

## 🚀 Getting Started

Logging in with Linkdirecte is extremely easy and flexible. You can use standard positional parameters or a modern, unified options object.

### Option A: Positional Style (Classic)

Perfect for quick scripts!

```typescript
import { login } from "@scolup/linkdirecte";

const session = await login("your_username", "your_password");
console.log(`Successfully logged in as ${session.user.prenom}!`);
```

### Option B: Unified Object Style (Recommended)

Perfect for application-level integration.

```typescript
import { login } from "@scolup/linkdirecte";

const session = await login({
  username: "your_username",
  password: "your_password",
  rememberMe: true, // Automatically refreshes session securely for easy subsequent reconnects!
});
console.log(`Hello, ${session.user.prenom}!`);
```

---

## 🔒 Handling Two-Factor Authentication (2FA)

EcoleDirecte frequently prompts users with security questions. Linkdirecte provides two different ways to tackle this challenge effortlessly!

### 1. The Automatic Callback (Simplest)

Provide an `on2faRequired` handler in your configuration. It will run whenever a 2FA challenge occurs. You can return either the index of the choice or the actual choice text (case-insensitive!).

```typescript
import { login } from "@scolup/linkdirecte";

const session = await login("username", "password", {
  on2faRequired: async (question, choices) => {
    console.log("Security Question:", question);
    console.log("Options:", choices);

    // You can prompt the user, or simply return a selection:
    return 0; // Selects the first choice
    // OR:
    return "The dress is white and gold"; // Selects the choice matching "The dress is white and gold" (case-insensitive)
  }
});
```

### 2. The Step-by-Step Response (Interactive)

If no callback is provided, `login()` returns a special `LoginChallenge` object. You can present this to your user and call its `.answer()` method when they're ready!

```typescript
import { login } from "@scolup/linkdirecte";

const result = await login("username", "password");

if (result.type === "securityQuestion") {
  console.log("2FA incoming!");
  console.log("Question:", result.question);
  console.log("Options:", result.choices);

  // Submit the selected choice index or option text:
  const session = await result.answer("My Secret Answer");
  console.log(`Logged in! Hello, ${session.user.prenom}`);
} else if (result.type === "success") {
  console.log(`Logged in... without 2FA?! Hello, ${result.user.prenom}`);
}
```

---

## 📖 API Reference

### `login`

Authenticates a student and registers the session.

```typescript
// Positional Signature
function login(
  identifiant: string,
  motdepasse: string,
  options?: LoginOptions
): Promise<LoginResult>

// Unified Object Signature
function login(
  params: LoginUnifiedOptions
): Promise<LoginResult>
```

#### Options & Aliases

When using the unified object style, you can use any of the following aliases to make your code look clean:
- **Username**: `identifiant`, `username`, or `identifier`
- **Password**: `motdepasse` or `password`

Other configurations:
- `rememberMe` *(boolean)*: If set to `true`, Linkdirecte stores the encrypted refresh tokens, UUID, and session identifiers (no password stored!) locally. This allows you to restore the session later without prompting the user for credentials.
- `on2faRequired` *(function)*: A callback triggered if a 2FA challenge is present.

---

### `logout`

Disconnects the active account, stops background keepalives, and completely wipes the session details from memory and storage.

```typescript
async function logout(): Promise<void>
```

---

### `refreshToken`

Renews the current session token behind the scenes. If you used `rememberMe: true` during your previous login, you can call this at startup to refresh your connection.

> [!TIP]
> This should be done automatically without your intervention if a request fails because of an invalid token.

```typescript
async function refreshToken(): Promise<string>
```

---

## 🗂️ Type Definitions

### `LoginResult`

The return value of `login()` is a union:

```typescript
type LoginResult = LoginSuccess | LoginChallenge;
```

### `LoginSuccess`

Returned when the user is successfully logged in.

```typescript
interface LoginSuccess {
  type: "success";     // Discriminator type
  user: Account;       // The active student account details
  token: string;       // Current API session token
  sessionId: string;   // Unique session ID
}
```

### `LoginChallenge`

Returned if EcoleDirecte requires a 2FA question response.

```typescript
interface LoginChallenge {
  type: "securityQuestion";
  question: string;
  choices: string[];
  answer: (choiceIndexOrText: number | string) => Promise<LoginSuccess>;
}
```

### `Account`

Contains the student's profile, classes, and active modules:

```typescript
interface Account {
  idLogin: number;
  id: number;
  uid: string;
  identifiant: string;
  typeCompte: "E" | "P" | "A" | "F"; // "E" for student
  prenom: string;
  nom: string;
  email: string;
  nomEtablissement: string;
  main: boolean;
  accessToken?: string;
  profile: {
    sexe: "M" | "F";
    photo: string;
    classe?: {
      id: number;
      code: string;
      libelle: string;
    };
  };
  modules: Array<{
    code: string;
    enable: boolean;
    badge: number;
    params: Record<string, any>;
  }>;
}
```
