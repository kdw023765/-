import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { getJobStatus, getStoredJob, updateRecentJobStatus, type JobResponse } from "@/lib/backendApi";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const progressByStatus = {
  pending: 20,
  processing: 65,
  done: 100,
  failed: 100,
};

export default function Processing() {
  const [, params] = useRoute("/processing/:videoId");
  const videoId = params?.videoId || null;
  const [, setLocation] = useLocation();

  const [job, setJob] = useState<JobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const storedJob = useMemo(() => (videoId ? getStoredJob(videoId) : undefined), [videoId]);

  useEffect(() => {
    if (!videoId || isCompleted) return;

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const nextJob = await getJobStatus(videoId);
        if (cancelled) return;

        setJob(nextJob);
        updateRecentJobStatus(videoId, nextJob.status);

        if (nextJob.status === "done") {
          setIsCompleted(true);
          timer = window.setTimeout(() => {
            setLocation(`/results/${videoId}`);
          }, 2000);
          return;
        }

        if (nextJob.status !== "failed") {
          timer = window.setTimeout(poll, 1000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "상태 조회 중 오류가 발생했습니다.");
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [videoId, isCompleted, setLocation]);

  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600">유효하지 않은 비디오 ID입니다.</p>
        </div>
      </div>
    );
  }

  const status = job?.status || "pending";
  const progress = progressByStatus[status];
  const statusMessage =
    error || job?.error || job?.message || "영상을 분석하고 있습니다.";
  const statusLabel =
    status === "pending"
      ? "대기 중"
      : status === "processing"
        ? "처리 중"
        : status === "failed"
          ? "실패"
          : "완료";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">
              하이라이트 추출 중
            </h1>
            <p className="text-slate-600">
              {storedJob?.filename || "영상"}을 분석하고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">
                  진행률
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : status === "failed" || error ? (
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {statusMessage}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {status === "done"
                      ? "완료되었습니다. 결과 페이지로 이동합니다..."
                      : status === "failed"
                        ? "처리에 실패했습니다."
                        : "계속 진행 중입니다."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-600 mb-1">상태</p>
              <p className="text-sm font-semibold text-slate-900 capitalize">
                {statusLabel}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-600 mb-1">작업 ID</p>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {videoId}
              </p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800">
              <strong>팁:</strong> 이 페이지를 닫아도 백엔드에서 계속 처리됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
