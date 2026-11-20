/**
 * Security audit script — scans codebase for common vulnerabilities
 * SQL injection, XSS, CSRF, auth bypass, secrets in code, etc.
 * Run: npx tsx scripts/security-audit.ts
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

interface Finding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  file: string;
  line: number;
  snippet: string;
  recommendation: string;
}

const findings: Finding[] = [];
const SRC = join(process.cwd(), "src");

// ── File walker ─────────────────────────────────────────────────────────────
function walkDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory() && !entry.startsWith(".") && entry !== "node_modules" && entry !== "generated") {
      files.push(...walkDir(full));
    } else if ([".ts", ".tsx"].includes(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

function scan(file: string, lines: string[]) {
  const rel = file.replace(process.cwd() + "\\", "").replace(/\\/g, "/");

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const trim = line.trim();

    // ── SQL INJECTION ──────────────────────────────────────────────────────
    // Unsafe: template literal string interpolation inside $queryRaw / $executeRaw
    if (
      (trim.includes("$queryRaw") || trim.includes("$executeRaw")) &&
      trim.includes("${") &&
      !trim.includes("Prisma.sql`") &&
      !trim.includes("Prisma.join") &&
      !trim.includes("// safe")
    ) {
      findings.push({
        severity: "CRITICAL",
        category: "SQL Injection",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Use Prisma.sql`` tagged template or Prisma.join() — never interpolate user input directly into raw SQL strings",
      });
    }

    // Prisma.raw (deprecated unsafe API)
    if (trim.includes("Prisma.raw(") || trim.includes("prisma.raw(")) {
      findings.push({
        severity: "CRITICAL",
        category: "SQL Injection",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Replace Prisma.raw() with Prisma.sql tagged template — Prisma.raw() does NOT escape parameters",
      });
    }

    // ── XSS ───────────────────────────────────────────────────────────────
    // dangerouslySetInnerHTML with variable content
    if (trim.includes("dangerouslySetInnerHTML") && trim.includes("{__html")) {
      findings.push({
        severity: "HIGH",
        category: "XSS",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Sanitize HTML with DOMPurify before dangerouslySetInnerHTML, or avoid entirely",
      });
    }

    // eval / Function constructor
    if (/\beval\s*\(/.test(trim) || /new\s+Function\s*\(/.test(trim)) {
      findings.push({
        severity: "CRITICAL",
        category: "Code Injection / XSS",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Never use eval() or new Function() with user-controlled input",
      });
    }

    // ── SECRETS IN CODE ───────────────────────────────────────────────────
    // Hardcoded secrets (not env vars)
    if (
      /(?:password|secret|apikey|api_key|token|private_key)\s*[:=]\s*["'][^"'${\s]{6,}/i.test(trim) &&
      !trim.startsWith("//") &&
      !trim.startsWith("*") &&
      !trim.includes("process.env") &&
      !trim.includes("placeholder") &&
      !trim.includes("example")
    ) {
      findings.push({
        severity: "CRITICAL",
        category: "Hardcoded Secret",
        file: rel,
        line: lineNo,
        snippet: "[REDACTED — matches secret pattern]",
        recommendation: "Move all secrets to environment variables. Never commit credentials to source code.",
      });
    }

    // ── AUTH BYPASS ───────────────────────────────────────────────────────
    // Server actions or API routes missing auth guard
    if (
      rel.includes("/api/") &&
      (trim.includes("export async function") || trim.includes("export function")) &&
      !lines.slice(0, Math.min(lineNo + 20, lines.length)).join("\n").includes("requireRole") &&
      !lines.slice(0, Math.min(lineNo + 20, lines.length)).join("\n").includes("requireUser") &&
      !lines.slice(0, Math.min(lineNo + 20, lines.length)).join("\n").includes("auth(")
    ) {
      // Only flag if it's a handler (GET, POST, PUT, DELETE, PATCH)
      if (/export (async )?function (GET|POST|PUT|DELETE|PATCH)/.test(trim)) {
        findings.push({
          severity: "HIGH",
          category: "Auth Bypass Risk",
          file: rel,
          line: lineNo,
          snippet: trim.slice(0, 120),
          recommendation: "Ensure every API route verifies session with requireRole() or requireUser() before processing",
        });
      }
    }

    // "use server" actions missing validation
    if (
      rel.includes("actions.ts") &&
      (trim.startsWith("export async function") || trim.startsWith("export function")) &&
      !lines.slice(Math.max(0, i - 5), Math.min(i + 30, lines.length)).join("\n").includes("requireRole") &&
      !lines.slice(Math.max(0, i - 5), Math.min(i + 30, lines.length)).join("\n").includes("requireUser") &&
      !lines.slice(Math.max(0, i - 5), Math.min(i + 30, lines.length)).join("\n").includes("getUser(")
    ) {
      findings.push({
        severity: "MEDIUM",
        category: "Server Action Auth",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Verify every server action checks session. Consider centralising auth in a wrapper.",
      });
    }

    // ── INSECURE HEADERS ──────────────────────────────────────────────────
    if (trim.includes("res.setHeader") && trim.includes("Access-Control-Allow-Origin") && trim.includes('"*"')) {
      findings.push({
        severity: "HIGH",
        category: "CORS Misconfiguration",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Replace wildcard CORS with specific allowed origins",
      });
    }

    // ── OPEN REDIRECT ─────────────────────────────────────────────────────
    if (trim.includes("redirect(") && trim.includes("searchParams") && !trim.includes("//")) {
      findings.push({
        severity: "MEDIUM",
        category: "Open Redirect",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Validate redirect URLs against an allowlist — never redirect to arbitrary user-supplied URLs",
      });
    }

    // ── INSECURE COOKIE / SESSION ─────────────────────────────────────────
    if (trim.includes("httpOnly: false") || trim.includes("secure: false")) {
      findings.push({
        severity: "HIGH",
        category: "Insecure Cookie",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Session cookies must use httpOnly: true and secure: true in production",
      });
    }

    // ── PROTOTYPE POLLUTION ───────────────────────────────────────────────
    if (trim.includes("Object.assign(") && (trim.includes("req.body") || trim.includes("req.query"))) {
      findings.push({
        severity: "HIGH",
        category: "Prototype Pollution",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Never directly Object.assign() user-supplied data — validate with Zod schema first",
      });
    }

    // ── MISSING INPUT VALIDATION ──────────────────────────────────────────
    // Server action params not going through Zod
    if (
      rel.includes("actions.ts") &&
      trim.includes("formData.get(") &&
      !lines.slice(Math.max(0, i - 2), Math.min(i + 15, lines.length)).join("\n").includes("parse") &&
      !lines.slice(Math.max(0, i - 2), Math.min(i + 15, lines.length)).join("\n").includes("safeParse")
    ) {
      findings.push({
        severity: "MEDIUM",
        category: "Missing Input Validation",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 120),
        recommendation: "Pipe all formData through a Zod schema before using the values",
      });
    }

    // ── RATE LIMITING ─────────────────────────────────────────────────────
    if (rel.includes("/api/auth") && trim.includes("export") && /function (POST|GET)/.test(trim)) {
      findings.push({
        severity: "INFO",
        category: "Rate Limiting",
        file: rel,
        line: lineNo,
        snippet: trim.slice(0, 80),
        recommendation: "Ensure Better Auth has brute-force / rate-limit protection on login endpoint (better-auth rateLimit option)",
      });
    }
  });
}

// ── Run scan ─────────────────────────────────────────────────────────────────
const files = walkDir(SRC);
console.log(`\n🔒 Security Audit — scanning ${files.length} source files...\n`);

for (const file of files) {
  const lines = readFileSync(file, "utf-8").split("\n");
  scan(file, lines);
}

// Also check next.config.ts for security headers
const nextConfigPath = join(process.cwd(), "next.config.ts");
try {
  const configContent = readFileSync(nextConfigPath, "utf-8");
  const hasSecurityHeaders =
    configContent.includes("Content-Security-Policy") ||
    configContent.includes("X-Frame-Options") ||
    configContent.includes("Strict-Transport-Security");
  if (!hasSecurityHeaders) {
    findings.push({
      severity: "HIGH",
      category: "Missing HTTP Security Headers",
      file: "next.config.ts",
      line: 1,
      snippet: "(no security headers found)",
      recommendation: "Add CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS headers in next.config.ts headers()",
    });
  } else {
    findings.push({
      severity: "INFO",
      category: "HTTP Security Headers",
      file: "next.config.ts",
      line: 1,
      snippet: "Security headers present",
      recommendation: "✅ Good",
    });
  }
} catch {}

// ── Print results ─────────────────────────────────────────────────────────────
const bySeverity = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
const icons: Record<string, string> = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🟢",
  INFO: "🔵",
};

for (const sev of bySeverity) {
  const group = findings.filter((f) => f.severity === sev);
  if (group.length === 0) continue;
  console.log(`\n${icons[sev]} ${sev} (${group.length})\n${"─".repeat(80)}`);
  for (const f of group) {
    console.log(`  Category : ${f.category}`);
    console.log(`  File     : ${f.file}:${f.line}`);
    console.log(`  Snippet  : ${f.snippet}`);
    console.log(`  Fix      : ${f.recommendation}`);
    console.log();
  }
}

const critical = findings.filter((f) => f.severity === "CRITICAL").length;
const high = findings.filter((f) => f.severity === "HIGH").length;
const medium = findings.filter((f) => f.severity === "MEDIUM").length;

console.log("─".repeat(80));
console.log(`\n📋 SUMMARY`);
console.log(`   Files scanned : ${files.length}`);
console.log(`   🔴 Critical   : ${critical}`);
console.log(`   🟠 High       : ${high}`);
console.log(`   🟡 Medium     : ${medium}`);
console.log(`   🟢 Low        : ${findings.filter((f) => f.severity === "LOW").length}`);
console.log(`   🔵 Info       : ${findings.filter((f) => f.severity === "INFO").length}`);

if (critical === 0 && high === 0) {
  console.log(`\n✅ No critical or high-severity vulnerabilities found.\n`);
} else {
  console.log(`\n⚠️  ${critical + high} issue(s) need immediate attention.\n`);
}
