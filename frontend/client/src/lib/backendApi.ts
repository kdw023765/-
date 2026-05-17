const configuredApiBaseUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "");
const API_BASE_URLS = configuredApiBaseUrl
  ? [configuredApiBaseUrl]
  : ["", "http://localhost:8000"];

export type JobStatus = "pending" | "processing" | "done" | "failed";

export interface GoalEvent {
  timestamp_minutes: number;
  timestamp_str: string;
  segment_index: number;
  confidence: number;
  description?: string | null;
}

export interface HighlightResult {
  job_id: string;
  total_duration_minutes: number;
  highlights: GoalEvent[];
  segment_count: number;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  message?: string | null;
  result?: HighlightResult | null;
  error?: string | null;
}

export interface StoredJob {
  job_id: string;
  filename: string;
  uploadedAt: string;
  status: JobStatus;
}

const recentJobsKey = "soccer-highlight-jobs";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : typeof payload?.error === "string"
          ? payload.error
          : "요청 처리 중 오류가 발생했습니다.";
    throw new Error(detail);
  }

  return payload as T;
}

async function fetchFromBackend<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);
      return await parseJsonResponse<T>(response);
    } catch (error) {
      lastError = error;

      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const detail = lastError instanceof Error ? lastError.message : "알 수 없는 네트워크 오류";
  throw new Error(
    `백엔드에 연결하지 못했습니다. /api 프록시와 http://localhost:8000을 순서대로 시도했습니다. (${detail})`
  );
}

export async function uploadVideo(file: File): Promise<JobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return fetchFromBackend<JobResponse>("/api/upload", {
    method: "POST",
    body: formData,
  });
}

export async function getJobStatus(jobId: string): Promise<JobResponse> {
  return fetchFromBackend<JobResponse>(`/api/status/${jobId}`);
}

export function getRecentJobs(): StoredJob[] {
  try {
    const raw = localStorage.getItem(recentJobsKey);
    return raw ? (JSON.parse(raw) as StoredJob[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentJob(job: StoredJob) {
  const existing = getRecentJobs().filter((item) => item.job_id !== job.job_id);
  localStorage.setItem(recentJobsKey, JSON.stringify([job, ...existing].slice(0, 20)));
}

export function updateRecentJobStatus(jobId: string, status: JobStatus) {
  const jobs = getRecentJobs().map((job) =>
    job.job_id === jobId ? { ...job, status } : job
  );
  localStorage.setItem(recentJobsKey, JSON.stringify(jobs));
}

export function removeRecentJob(jobId: string) {
  const jobs = getRecentJobs().filter((job) => job.job_id !== jobId);
  localStorage.setItem(recentJobsKey, JSON.stringify(jobs));
}

export function getStoredJob(jobId: string) {
  return getRecentJobs().find((job) => job.job_id === jobId);
}
