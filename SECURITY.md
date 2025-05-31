**Title: Dependency Security Vulnerabilities Detected**

**Description:**
Automated audit (`npm audit`) reveals three high-severity issues in my current dependency set. 
Fixing them requires upgrading to versions that introduce breaking changes (e.g., LangChain 0.3.27 or Puppeteer 24.x), 
so I must keep the following versions pinned until compatibility updates are implemented.

---

1. **@langchain/community < 0.3.3**

   * **Vulnerability:** SQL Injection in `GraphCypherQAChain` (GHSA-6m59-8fmv-m5f9)
   * **Affected:** Our code uses `langchain@≤0.2.18`, which depends on `@langchain/community@<0.3.3`.
   * **Fix:** Upgrade to `@langchain/community@0.3.3` (will require `langchain@0.3.27`, a breaking change).

2. **tar-fs 2.0.0 – 2.1.1**

   * **Vulnerability:** Path Traversal / Link Following when extracting a malicious tar (GHSA-pq67-2wwv-3xjx)
   * **Affected:** `@puppeteer/browsers@≤1.4.1` → `puppeteer-core@10.0.0–22.11.1` → `tar-fs@2.x`.
   * **Fix:** Upgrade to `tar-fs@≥2.1.2` by moving `puppeteer@24.9.0` (breaking change).

3. **ws 8.0.0 – 8.17.0**

   * **Vulnerability:** Denial-of-Service when handling requests with many HTTP headers (GHSA-3h5v-q93c-6h6q)
   * **Affected:** `puppeteer-core@10.0.0–22.11.1` depends on `ws@^8`.
   * **Fix:** Upgrade to `ws@8.17.1` (indirectly via `puppeteer@24.9.0`, also a breaking change).

---

**Current Pinned Versions (Must Remain Until Compatibility Fixes):**

* `langchain@0.2.x` (locks `@langchain/community@<0.3.3`)
* `puppeteer@22.11.1` (locks `@puppeteer/browsers@≤1.4.1`, `tar-fs@2.x`, `ws@8.x`)