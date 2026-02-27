import { getSupabaseAdmin } from "./supabase-admin";
import { log } from "./logger";

type JobRecord = {
  id: string;
  company_id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

const BATCH_LIMIT = 50;

export async function enqueueJob(companyId: string, type: string, payload: Record<string, unknown>, runAt?: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("jobs").insert({
    company_id: companyId,
    type,
    payload,
    run_at: runAt ?? new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function processJobs() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("claim_jobs", { p_limit: BATCH_LIMIT });
  if (error) {
    throw error;
  }

  const jobs = (data ?? []) as JobRecord[];
  for (const job of jobs) {
    try {
      await executeJob(job);
      await supabase.rpc("finish_job", {
        p_job_id: job.id,
        p_status: "done",
        p_error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "unknown_error";
      log("error", "job_execution_failed", { jobId: job.id, type: job.type, error: errorMessage });
      await supabase.rpc("finish_job", {
        p_job_id: job.id,
        p_status: "failed",
        p_error: errorMessage,
      });
    }
  }

  return { processed: jobs.length };
}

async function executeJob(job: JobRecord): Promise<void> {
  switch (job.type) {
    case "lead_scoring":
    case "refresh_embedding":
    case "daily_sales_brief":
    case "normalize_contacts":
      log("info", "job_executed", { jobId: job.id, type: job.type, companyId: job.company_id });
      return;
    default:
      throw new Error(`unsupported_job_type:${job.type}`);
  }
}
