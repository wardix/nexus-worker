# Nexus Worker - Next-Generation NATS Consumer

**IMPORTANT CONTEXT FOR GEMINI CLI:**
You are working on `nexus-worker`, a modernized NATS background worker designed to replace the legacy `romusha` project. 
All new development, specifically creating new jobs, MUST follow the architecture inside this directory.

## 🚀 Project Overview

`nexus-worker` is built with **Bun**, **TypeScript**, **NATS JetStream**, **Zod** (for schema validation), and **Pino** (for structured logging). It uses a clean, domain-driven architecture to ensure high reliability, type safety, and ease of maintenance.

### Core Architecture & Best Practices
1. **Type-Safe Configuration (`src/config/env.ts`)**: All environment variables are strictly validated using Zod at startup. Never use `process.env` directly in job logic; always import `ENV` from `src/config/env.ts`. Ini juga termasuk variabel untuk autentikasi NATS (`NATS_USER`, `NATS_PASS`, `NATS_TOKEN`).
2. **BaseJob Abstraction (`src/core/base-job.ts`)**: All new jobs MUST extend the `BaseJob<PayloadType>` abstract class. This class automatically handles:
   - Decoding the NATS message payload.
   - Validating the payload against a Zod schema.
   - Message Acknowledgment (`msg.ack()`) on success and Negative Acknowledgment (`msg.nak()`) on failure.
   - Structured logging with `traceId`.
3. **Feature-Sliced Design (Domains)**: Jobs are grouped by their business domain (e.g., `src/domains/ticket/`, `src/domains/notification/`).
4. **Code Quality Standards**: Seluruh kode WAJIB mengikuti standar BiomeJS (indentasi: space, quotes: single, semicolons: asNeeded). Gunakan `bun run format` sebelum melakukan commit.

## 🏗 How to Create a New Job (Instructions for Gemini CLI)

When asked to create a new job, follow these strict steps:

### 1. Define the Domain and Path
Determine the appropriate domain for the job. Create a new file in `src/domains/<domain-name>/jobs/<job-name>.job.ts`.

### 2. Scaffold the Job Class
The new job must:
- Import `z` from `zod`, `BaseJob` from `../../../core/base-job` (adjust relative path as needed), and `JsMsg` from `nats`.
- Define a `PayloadSchema` using Zod to strictly validate incoming data.
- Create a class extending `BaseJob<Payload>` that implements:
  - `readonly subject`: The exact NATS routing key.
  - `protected validatePayload(data: unknown)`: Parses the data using the Zod schema.
  - `protected async handle(payload: Payload, msg: JsMsg)`: Contains the actual business logic. Use the pre-configured `logger` for output.

### 3. Register the Job
Once the job file is created, you MUST register it in `src/main.ts`:
- Import the new job class.
- Instantiate it inside the `registeredJobs` array.

## 🏃 Running the Application

### Development
To run the worker with hot-reloading:
```bash
bun run dev
```

### Adding Dependencies
Always use Bun to add dependencies:
```bash
bun add <package-name>
```

## 📝 Example Job Implementation
Reference `src/domains/notification/jobs/send-welcome-email.job.ts` to understand the standard structure of a job. Do not deviate from this pattern unless explicitly instructed.
