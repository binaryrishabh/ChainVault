export interface StageResult {
  status: "passed" | "warning" | "failed";
  summary: string;
  details: Record<string, any>;
}