import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { getStoredJob } from "@/lib/backendApi";
import { Film, Home, ChevronRight, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const TEAMS = ["홈팀", "원정팀"];

const HIGHLIGHT_TYPES = [
  { id: "goal", label: "골", description: "골 장면을 중심으로 확인" },
  { id: "post", label: "골대 맞고 나간 장면", description: "골대를 맞춘 위협적인 장면" },
  { id: "foul", label: "파울", description: "파울 장면" },
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { videoId } = useParams<{ videoId: string }>();
  const [selectedTeam, setSelectedTeam] = useState("홈팀");
  const [minDuration, setMinDuration] = useState(5);
  const [maxDuration, setMaxDuration] = useState(30);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["goal", "post", "foul"]);
  const [minConfidence, setMinConfidence] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const storedJob = videoId ? getStoredJob(videoId) : undefined;

  const toggleHighlightType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleStartProcessing = async () => {
    if (!videoId) {
      toast.error("비디오 ID가 없습니다.");
      return;
    }

    if (selectedTypes.length === 0) {
      toast.error("최소 하나의 하이라이트 타입을 선택해주세요.");
      return;
    }

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
              하이라이트 설정
            </h2>
            <p className="text-slate-600">
              프론트에서 옵션을 확인한 뒤 처리 상태를 조회합니다.
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

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                팀 선택
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                어떤 팀의 하이라이트를 우선 확인할지 선택하세요.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TEAMS.map((team) => (
                  <button
                    key={team}
                    onClick={() => setSelectedTeam(team)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-300 border-2 ${
                      selectedTeam === team
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                하이라이트 타입
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                확인하고 싶은 하이라이트 타입을 선택하세요. 현재 백엔드는 전체 결과를 반환합니다.
              </p>
              <div className="space-y-3">
                {HIGHLIGHT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => toggleHighlightType(type.id)}
                    className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                      selectedTypes.includes(type.id)
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{type.label}</p>
                        <p className="text-sm text-slate-600">{type.description}</p>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedTypes.includes(type.id)
                            ? "border-blue-600 bg-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {selectedTypes.includes(type.id) && (
                          <span className="text-white text-sm">✓</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                하이라이트 길이 설정
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      최소 길이
                    </label>
                    <span className="text-lg font-semibold text-blue-600">
                      {minDuration}초
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={minDuration}
                    onChange={(e) => setMinDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      최대 길이
                    </label>
                    <span className="text-lg font-semibold text-blue-600">
                      {maxDuration}초
                    </span>
                  </div>
                  <input
                    type="range"
                    min={minDuration}
                    max="120"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                신뢰도 임계값
              </h3>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-slate-700">
                  최소 신뢰도
                </label>
                <span className="text-lg font-semibold text-blue-600">
                  {minConfidence}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            <Button
              onClick={handleStartProcessing}
              disabled={isProcessing || selectedTypes.length === 0}
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
