---
name: Zod import in api-server
description: Use "zod" not "zod/v4" in api-server to avoid esbuild resolution errors
---

`import { z } from "zod/v4"` fails with esbuild bundling in api-server.

**Why:** esbuild cannot resolve the `zod/v4` subpath export in this workspace setup.

**How to apply:** Always use `import { z } from "zod"` in api-server code. Zod v4 is the default export so behavior is identical.
