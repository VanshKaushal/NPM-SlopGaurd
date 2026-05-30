# MONOREPO SURVIVABILITY RFC

## 1. Abstract
This document defines SlopGuard's architectural guarantees regarding performance and stability when deployed inside ultra-large-scale enterprise monorepos (e.g., >40,000 dependencies, >2,000 workspaces).

## 2. Graph Traversal Stability
SlopGuard implements an iterative graph traversal algorithm that bypasses the call stack limitations of V8. This ensures deep, highly recursive dependency trees will never cause a `Maximum call stack size exceeded` crash.

## 3. Memory Boundaries
Memory consumption is bounded via stream-based parsing of large `package-lock.json` and `pnpm-lock.yaml` files, capping memory growth independently of the lockfile's absolute size.

## 4. Concurrency Management
Network requests and file system operations are strictly pooled to avoid file descriptor exhaustion (`EMFILE`) during parallel workspace installation operations.
