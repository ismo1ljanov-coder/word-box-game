---
name: Session save pattern
description: Express session.save() must wrap the response to avoid 401 on next request
---

`req.session.save()` must be used when setting session data before responding:

```typescript
req.session.userId = user.id;
req.session.save((err) => {
  if (err) { res.status(500).json({ error: "Session error" }); return; }
  res.json({ ... });
});
```

**Why:** Without `save()`, the session write is async and the response can return before the session is persisted to the store (PostgreSQL). The next request then gets a 401 because the session hasn't been committed yet.

**How to apply:** Always wrap `res.json()` inside `req.session.save()` callback after setting session variables (login, register). Logout uses `req.session.destroy()` which is the correct pattern there.
