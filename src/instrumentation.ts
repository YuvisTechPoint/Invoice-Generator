export async function register() {
  if (process.env.NODE_ENV !== "production") return;

  const { getProductionIssues } = await import("@/lib/config/env");
  const issues = getProductionIssues();

  if (issues.length > 0) {
    console.warn(
      "[invoice-generator] Production configuration issues:\n" +
        issues.map((issue) => `  - ${issue}`).join("\n")
    );
  }
}
