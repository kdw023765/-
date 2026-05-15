import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function Processing() {
  const [, params] = useRoute("/processing/:videoId");
  const videoId = params?.videoId ? parseInt(params.videoId) : null;
  const [, setLocation] = useLocation();

  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("pending");
  const [statusMessage, setStatusMessage] = useState("준비 중...");
  const [isCompleted, setIsCompleted] = useState(false);

  // 진행 상태 폴링
  const { data: progressData, isLoading } = trpc.video.getProgress.useQuery(
    { videoId: videoId || 0 },
    {
      enabled: videoId !== null && !isCompleted,
      refetchInterval: 1000, // 1초마다 폴링
    }
  );

  useEffect(() => {
    if (progressData) {
      setProgress(progressData.progress);
      setStatus(progressData.status);
      setStatusMessage(progressData.statusMessage || "처리 중...");

      // 완료 상태 확인
      if (progressData.status === "completed") {
        setIsCompleted(true);
        // 2초 후 결과 페이지로 이동
        setTimeout(() => {
          setLocation(`/results/${videoId}`);
        }, 2000);
      }
    }
  }, [progressData, videoId, setLocation]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-lg p-8 space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">
              하이라이트 추출 중
            </h1>
            <p className="text-slate-600">
              영상을 분석하고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>

          {/* 진행 상황 표시 */}
          <div className="space-y-4">
            {/* 프로그레스 바 */}
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

            {/* 상태 메시지 */}
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                ) : (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {statusMessage}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {status === "completed"
                      ? "완료되었습니다. 결과 페이지로 이동합니다..."
                      : "계속 진행 중입니다."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-600 mb-1">상태</p>
              <p className="text-sm font-semibold text-slate-900 capitalize">
                {status === "pending"
                  ? "대기 중"
                  : status === "processing"
                  ? "처리 중"
                  : "완료"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-600 mb-1">소요 시간</p>
              <p className="text-sm font-semibold text-slate-900">
                {progressData?.updatedAt
                  ? new Date(progressData.updatedAt).toLocaleTimeString()
                  : "-"}
              </p>
            </div>
          </div>

          {/* 팁 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800">
              💡 <strong>팁:</strong> 이 페이지를 닫아도 백그라운드에서 계속
              처리됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
