import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { getJobStatus, getStoredJob, resolveBackendUrl, type GoalEvent, type JobResponse } from "@/lib/backendApi";
import { Film, Home, Play, Zap, Clock, FileText, SlidersHorizontal } from "lucide-react";

function formatMinutes(value: number) {
  const totalSeconds = Math.round(value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatKoreanTime(value: number) {
  const totalSeconds = Math.round(value * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds}초`;
}

function getConfidencePercent(highlight: GoalEvent) {
  return Math.round(highlight.confidence * 100);
}

function getStoredOutputOptions(videoId?: string) {
  if (!videoId) return ["timeline", "txt", "handle"];

  try {
    const raw = sessionStorage.getItem(`result-output-options:${videoId}`);
    const parsed = raw ? JSON.parse(raw) : null;

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as string[];
    }
  } catch {
    // 기본 표시 방식 사용
  }

  return ["timeline", "txt", "handle"];
}

export default function Results() {
  const [, navigate] = useLocation();
  const { videoId } = useParams<{ videoId: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storedJob = useMemo(() => (videoId ? getStoredJob(videoId) : undefined), [videoId]);
  const selectedOutputOptions = useMemo(() => getStoredOutputOptions(videoId), [videoId]);

  useEffect(() => {
    if (!videoId) return;

    getJobStatus(videoId)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "결과를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [videoId]);

  const result = job?.result;
  const highlights = result?.highlights || [];
  const durationMinutes = result?.total_duration_minutes || 0;
  const uploadedVideoUrl = resolveBackendUrl(job?.video_url);
  const showTimeline = selectedOutputOptions.includes("timeline");
  const showTxt = selectedOutputOptions.includes("txt");
  const showHandle = selectedOutputOptions.includes("handle");

  const seekToHighlight = (highlight: GoalEvent) => {
    const seconds = Math.max(0, highlight.timestamp_minutes * 60);

    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => undefined);
      videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Film className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error || "비디오를 찾을 수 없습니다."}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="border-b border-slate-200/50 backdrop-blur-sm sticky top-0 z-50 bg-white/80">
        <div className="container h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Soccer Highlights</h1>
          </button>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-slate-600 hover:text-slate-900"
          >
            <Home className="w-5 h-5 mr-2" />
            홈
          </Button>
        </div>
      </header>

      <main className="container py-12 md:py-20">
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {storedJob?.filename || "업로드된 영상"}
                </h2>
                <p className="text-slate-600 text-sm">
                  작업 ID: {videoId}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                job.status === "done"
                  ? "bg-green-100 text-green-700"
                  : job.status === "processing"
                    ? "bg-blue-100 text-blue-700"
                    : job.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-700"
              }`}>
                {job.status === "done" && "완료"}
                {job.status === "processing" && "처리 중"}
                {job.status === "pending" && "대기 중"}
                {job.status === "failed" && "실패"}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-1">영상 길이</p>
                <p className="text-lg font-semibold text-slate-900">
                  {result ? formatMinutes(result.total_duration_minutes) : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">분할 세그먼트</p>
                <p className="text-lg font-semibold text-slate-900">
                  {result?.segment_count ?? "—"}개
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">하이라이트 수</p>
                <p className="text-lg font-semibold text-slate-900">
                  {highlights.length}개
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">
            추출된 하이라이트
          </h3>

          {job.status !== "done" ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                아직 처리가 완료되지 않았습니다.
              </p>
            </div>
          ) : highlights.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                추출된 하이라이트가 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-5 h-5 text-blue-600" />
                  <h4 className="text-lg font-semibold text-slate-900">업로드한 영상</h4>
                </div>

                {uploadedVideoUrl ? (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      src={uploadedVideoUrl}
                      controls
                      className="w-full rounded-xl bg-black max-h-[520px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      {highlights.map((highlight, index) => (
                        <button
                          key={`video-jump-${highlight.segment_index}-${highlight.timestamp_minutes}-${index}`}
                          onClick={() => seekToHighlight(highlight)}
                          className="px-3 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-sm font-semibold hover:bg-blue-100 transition-colors"
                        >
                          {index + 1}. {highlight.timestamp_str || formatMinutes(highlight.timestamp_minutes)} 이동
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-6 text-sm text-slate-600 text-center">
                    업로드 영상 URL이 없습니다. 새로 업로드한 영상부터 표시됩니다.
                  </div>
                )}
              </div>

              {showHandle && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-slate-900">영상 핸들바</h4>
                  </div>
                  <div className="h-4 bg-slate-200 rounded-full relative overflow-visible">
                    {highlights.map((highlight, index) => {
                      const percent = durationMinutes > 0
                        ? Math.min(100, Math.max(0, (highlight.timestamp_minutes / durationMinutes) * 100))
                        : 0;

                      return (
                        <button
                          key={`handle-${highlight.segment_index}-${highlight.timestamp_minutes}-${index}`}
                          onClick={() => seekToHighlight(highlight)}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                          style={{ left: `${percent}%` }}
                          title={highlight.timestamp_str || formatMinutes(highlight.timestamp_minutes)}
                        >
                          <span className="block w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow" />
                          <span className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 top-6 whitespace-nowrap bg-slate-900 text-white text-xs rounded px-2 py-1 z-10">
                            {highlight.timestamp_str || formatMinutes(highlight.timestamp_minutes)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-3">
                    <span>0:00</span>
                    <span>{result ? formatMinutes(result.total_duration_minutes) : "—"}</span>
                  </div>
                </div>
              )}

              {showTimeline && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-slate-900">타임라인</h4>
                  </div>
                  <div className="space-y-4">
                    {highlights.map((highlight, index) => (
                      <button
                        key={`timeline-${highlight.segment_index}-${highlight.timestamp_minutes}-${index}`}
                        onClick={() => seekToHighlight(highlight)}
                        className="flex gap-4 w-full text-left rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          {index < highlights.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-2" />}
                        </div>
                        <div className="pb-4 flex-1">
                          <p className="font-semibold text-slate-900">
                            {highlight.timestamp_str || formatMinutes(highlight.timestamp_minutes)} 골 장면
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            영상 기준 {formatKoreanTime(highlight.timestamp_minutes)} · 신뢰도 {getConfidencePercent(highlight)}%
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showTxt && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-slate-900">txt</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 leading-7">
                    {highlights.map((highlight, index) => (
                      <button
                        key={`txt-${highlight.segment_index}-${highlight.timestamp_minutes}-${index}`}
                        onClick={() => seekToHighlight(highlight)}
                        className="block w-full text-left hover:text-blue-700 transition-colors"
                      >
                        {index + 1}. 골 장면은 {formatKoreanTime(highlight.timestamp_minutes)}에 발생했습니다.
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {highlights.map((highlight, index) => (
                  <div
                    key={`${highlight.segment_index}-${highlight.timestamp_minutes}-${index}`}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                  >
                    <button
                      onClick={() => seekToHighlight(highlight)}
                      className="bg-gradient-to-br from-slate-200 to-slate-300 h-40 w-full flex items-center justify-center relative group"
                    >
                      <Play className="w-12 h-12 text-white opacity-60" />
                    </button>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold border bg-green-100 text-green-700 border-green-300">
                          골 장면
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          신뢰도: {getConfidencePercent(highlight)}%
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">발생 시각</span>
                          <span className="font-semibold text-slate-900">
                            {highlight.timestamp_str || formatMinutes(highlight.timestamp_minutes)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">영상 기준</span>
                          <span className="font-semibold text-slate-900">
                            {formatMinutes(highlight.timestamp_minutes)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">세그먼트</span>
                          <span className="font-semibold text-slate-900">
                            {highlight.segment_index}
                          </span>
                        </div>
                      </div>

                      {highlight.description && (
                        <p className="text-sm text-slate-600 mb-4">
                          {highlight.description}
                        </p>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => seekToHighlight(highlight)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        해당 시점 재생
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto mt-12 flex gap-4">
          <Button
            onClick={() => navigate("/upload")}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            다른 영상 업로드
          </Button>
          <Button
            onClick={() => navigate("/history")}
            variant="outline"
            className="flex-1"
          >
            처리 이력 보기
          </Button>
        </div>
      </main>
    </div>
  );
}
