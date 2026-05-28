import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { getStoredJob } from "@/lib/backendApi";
import { Film, Home, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const RESULT_OUTPUT_OPTIONS = [
  { id: "timeline", label: "타임라인", description: "하이라이트 발생 시각을 시간 순서대로 확인" },
  { id: "txt", label: "txt", description: "몇 분 몇 초인지 글자로 확인" },
  { id: "handle", label: "영상 핸들바", description: "업로드한 영상 위에 하이라이트 위치 표시" },
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { videoId } = useParams<{ videoId: string }>();
  const [selectedOutputOptions, setSelectedOutputOptions] = useState<string[]>([
    "timeline",
    "txt",
    "handle",
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const storedJob = videoId ? getStoredJob(videoId) : undefined;

  const toggleOutputOption = (optionId: string) => {
    setSelectedOutputOptions((prev) =>
      prev.includes(optionId) ? prev.filter((item) => item !== optionId) : [...prev, optionId]
    );
  };

  const handleStartProcessing = async () => {
    if (!videoId) {
      toast.error("비디오 ID가 없습니다.");
      return;
    }

    if (selectedOutputOptions.length === 0) {
      toast.error("최소 하나의 결과 생성 방식을 선택해주세요.");
      return;
    }

    sessionStorage.setItem(
      `result-output-options:${videoId}`,
      JSON.stringify(selectedOutputOptions)
    );

    setIsProcessing(true);
    toast.success("처리 상태 페이지로 이동합니다.");
    setTimeout(() => {
      navigate(`/processing/${videoId}`);
    }, 300);
  };

  if (!videoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">비디오 ID가 없습니다.</p>
          <Button onClick={() => navigate("/upload")} variant="outline">
            업로드로 돌아가기
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
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              결과 생성 방식 설정
            </h2>
            <p className="text-slate-600">
              하이라이트 추출 후 결과를 어떤 방식으로 보여줄지 선택합니다.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              영상 정보
            </h3>
            <div className="bg-slate-50 rounded-lg p-8 text-center">
              <p className="text-slate-900 font-medium">
                {storedJob?.filename || "업로드된 영상"}
              </p>
              <p className="text-sm text-slate-600 mt-2">작업 ID: {videoId}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-slate-200"></div>
            <p className="text-sm text-slate-600">처리 옵션 설정</p>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              결과 생성 방식
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              하이라이트가 추출된 뒤 결과 페이지에 표시할 방식을 선택하세요.
            </p>
            <div className="space-y-3">
              {RESULT_OUTPUT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => toggleOutputOption(option.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                    selectedOutputOptions.includes(option.id)
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{option.label}</p>
                      <p className="text-sm text-slate-600">{option.description}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selectedOutputOptions.includes(option.id)
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedOutputOptions.includes(option.id) && (
                        <span className="text-white text-sm">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            <Button
              onClick={handleStartProcessing}
              disabled={isProcessing || selectedOutputOptions.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6 text-lg"
            >
              {isProcessing ? (
                <>처리 중...</>
              ) : (
                <>
                  처리 상태 보기
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1 py-6 text-lg"
            >
              취소
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
