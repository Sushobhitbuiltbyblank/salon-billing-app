---
name: nodejs
description: Best practices, asynchronous patterns, error handling, filesystem operations, and architecture guidelines for Node.js backends, scripts, and server-side runtimes. Use when writing, debugging, or reviewing Node.js modules, API endpoints, or automation scripts.
---

# Node.js Development Skill

This skill enforces enterprise-grade engineering practices, robust asynchronous execution, safe I/O handling, and resilient error management for Node.js applications, server-side APIs, and automation scripts.

## When to Use This Skill
- Writing server-side modules, Next.js API route handlers, or Express/Fastify services.
- Creating automation, maintenance, or data migration scripts (`.mjs` / `.ts`).
- Implementing filesystem operations, JSON databases, streams, or cryptographic routines.
- Debugging unhandled promise rejections, memory leaks, or Event Loop blockage.

---

## 1. Asynchronous Architecture & Event Loop Safety

### Non-blocking Execution
Never execute long synchronous CPU-bound loops or synchronous I/O (`fs.readFileSync`, `fs.writeFileSync`) in request handlers or high-concurrency environments.

```javascript
// ❌ ANTI-PATTERN: Blocks the entire Node.js event loop
import fs from 'node:fs';
const data = fs.readFileSync('./large-dataset.json', 'utf8');

// ✅ CORRECT: Asynchronous with node:fs/promises
import fs from 'node:fs/promises';
const data = await fs.readFile('./large-dataset.json', 'utf8');
```

### Concurrency Control (`Promise.all` vs. `Promise.allSettled`)
- Use `Promise.all` when all operations are required and failure of one should abort all.
- Use `Promise.allSettled` for batch operations where partial successes must be preserved (e.g. sending notifications, syncing records).
- Use sequential loops (`for (const item of items) { await process(item); }`) or p-limit concurrency when hitting rate-limited external APIs or database connection pools.

```typescript
// Resilient batch execution without total failure
const results = await Promise.allSettled(
  invoices.map(invoice => syncInvoiceToRemote(invoice))
);

const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
if (failures.length > 0) {
  console.error(`Failed to sync ${failures.length} invoices:`, failures.map(f => f.reason));
}
```

---

## 2. Safe File System & Atomic Persistence

### Atomic File Writes
When storing JSON data locally (e.g., file-based databases or cache dumps), avoid direct overwrites that could corrupt the file if the process crashes or loses power mid-write. Write to a temporary file and atomically rename it:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  const tempPath = path.join(dir, `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`);
  
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, serialized, 'utf8');
  await fs.rename(tempPath, filePath); // Atomic replacement on POSIX
}
```

### Streaming Large Datasets
Avoid loading multi-megabyte files entirely into memory. Use Node.js streams and `pipeline`:

```typescript
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import zlib from 'node:zlib';

async function compressFile(input: string, output: string) {
  await pipeline(
    fs.createReadStream(input),
    zlib.createGzip(),
    fs.createWriteStream(output)
  );
}
```

---

## 3. Robust Error Handling & Exit Boundaries

### Standardized Error Hierarchy
Create domain-specific error classes with HTTP status codes and error categories:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'INTERNAL_ERROR',
    public readonly isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' was not found.`, 404, 'NOT_FOUND');
  }
}
```

### Graceful Process Shutdown
Always intercept process termination signals (`SIGINT`, `SIGTERM`) to flush buffers, close open database connections, and shut down HTTP servers cleanly:

```typescript
function registerGracefulShutdown(server: import('node:http').Server) {
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force terminate if graceful close hangs
    setTimeout(() => {
      console.error('Forceful shutdown timeout exceeded.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
```

---

## 4. Modern Node.js Conventions (ESM & Built-ins)

1. **Explicit `node:` Scheme Imports**: Always use the `node:` prefix for built-in modules (`node:fs/promises`, `node:path`, `node:crypto`, `node:os`, `node:events`).
2. **Environment Variable Validation**: Validate environment variables at process startup before any business logic executes (e.g., using Zod or typed guards).
3. **Structured Logging**: Use JSON logging or standard log levels (`debug`, `info`, `warn`, `error`) with timestamps and context instead of unstructured `console.log`.
4. **Child Processes & Shell Execution**: Never concatenate unsanitized user input into `child_process.exec`. Use `child_process.execFile` or `execa` with parameterized argument arrays.

---

## 5. Node.js Code Review Checklist
- [ ] Uses asynchronous `node:fs/promises` rather than blocking `*Sync` methods in request pipelines.
- [ ] Built-in imports explicitly prefixed with `node:`.
- [ ] No unhandled promise rejections; all async routes wrapped with try/catch or an error boundary.
- [ ] Secrets and keys accessed via validated environment variables, never hardcoded.
- [ ] Atomic file operations or transactions used for persistent data storage.
- [ ] Process signals (`SIGINT`, `SIGTERM`) properly handled for graceful shutdowns where applicable.
