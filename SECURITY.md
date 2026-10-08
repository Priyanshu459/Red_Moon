# Security Policy

## Supported Versions

Red Moon actively maintains security updates for the following releases:

| Version | Supported          | Security Status |
| ------- | ------------------ | --------------- |
| 1.0.x   | :white_check_mark: | Active support  |
| < 1.0   | :x:                | Deprecated      |

---

## Security Architecture & Threat Model

Red Moon implements enterprise-grade security controls designed for private, self-hosted media streaming:

1. **256-Bit Cryptographic Bearer Tokens**:
   - Master authentication tokens are generated using cryptographically secure pseudorandom entropy (`crypto.randomBytes(32)`).
   - All state-altering REST APIs (`/api/settings`, `/api/folders`, `/api/media/refresh`, `/api/open-folder-dialog`) mandate `Authorization: Bearer <token>` validation.

2. **Constant-Time Verification**:
   - Token comparisons utilize `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` to eliminate side-channel timing attacks.

3. **CWE-78 Command Injection Elimination**:
   - Zero unsanitized shell invocations (`child_process.exec` has been removed).
   - Native OS system calls (PowerShell folder picker, Tailscale status) execute strictly through `child_process.execFileSync` with explicit argument arrays, preventing argument injection and subshell execution.

4. **CWE-1321 Prototype Pollution Hardening**:
   - Settings updates and payload mergers filter forbidden keys (`__proto__`, `constructor`, `prototype`).
   - Deep-cloning safeguards ensure object prototypes remain unpolluted.

5. **Path Traversal & Containment Enforcement**:
   - Video and audio streaming endpoints verify that requested files reside strictly within user-authorized media directories using strict path normalization and prefix containment assertions.

6. **Tiered Dynamic Rate Limiting**:
   - Endpoint-specific sliding window rate limits protect sensitive APIs against brute-force attempts.
   - Internal rate-limit maps employ memory-bounded eviction algorithms to prevent memory exhaustion (DoS).

---

## Reporting a Vulnerability

If you discover a security vulnerability within Red Moon, please report it responsibly:

1. **Do not open a public issue.**
2. Send an email to the repository owner or open a [GitHub Private Vulnerability Report](https://github.com/Priyanshu459/Red_Moon/security/advisories/new).
3. Include the following in your report:
   - Detailed description of the vulnerability.
   - Proof of Concept (PoC) or reproducible steps.
   - Potential impact and affected components.

We will acknowledge receipt within 48 hours and work on a coordinated disclosure and patch release.
