import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Film, Home, ChevronRight, Settings as SettingsIcon, Play } from "lucide-react";
import { toast } from "sonner";

const TEAMS = [
  "홈팀",
  "어웨이팀",
];

const HIGHLIGHT_TYPES = [
  { id: "goal", label: "⚽ 골", description: "골 장면만 추출" },
  { id: "post", label: "🎯 골대 맞고 나감", description: "골대를 맞고 나간 장면" },
  { id: "foul", label: "🚩 파울", description: "파울 장면" },
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const videoQuery = trpc.video.getStatus.useQuery(
    { videoId: parseInt(videoId || "0") },
    { enabled: !!videoId }
  );

  const updateSettingsMutation = trpc.video.updateSettings.useMutation();
  const processMutation = trpc.video.startProcessing.useMutation();

  const video = videoQuery.data;

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

    try {
      // 설정 저장
      await updateSettingsMutation.mutateAsync({
        videoId: parseInt(videoId),
        team: selectedTeam,
        minHighlightDuration: minDuration,
        maxHighlightDuration: maxDuration,
        highlightTypes: selectedTypes,
        minConfidence,
      });

      // 처리 시작
      await processMutation.mutateAsync({ videoId: parseInt(videoId) });

      toast.success("처리가 시작되었습니다!");
      // Processing 페이지로 이동
      setTimeout(() => {
        navigate(`/processing/${videoId}`);
      }, 500);
    } catch (error) {
      console.error("Error:", error);
      toast.error("처리 중 오류가 발생했습니다.");
      setIsProcessing(false);
    }
  };

  if (videoQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">비디오를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
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
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              하이라이트 설정
            </h2>
            <p className="text-slate-600">
              처리 옵션을 설정한 후 하이라이트 추출을 시작하세요.
            </p>
          </div>

          {/* Video Preview Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              📹 영상 미리보기
            </h3>
            {video.videoUrl ? (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: "16/9" }}>
                  <video
                    src={video.videoUrl}
                    controls
                    className="w-full h-full object-contain"
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">파일명</p>
                    <p className="font-medium text-slate-900 truncate">{video.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">파일 크기</p>
                    <p className="font-medium text-slate-900">
                      {video.fileSize ? (video.fileSize / (1024 * 1024)).toFixed(2) : "—"} MB
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">영상 길이</p>
                    <p className="font-medium text-slate-900">
                      {video.duration ? `${Math.floor(video.duration / 60)}분 ${video.duration % 60}초` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <p className="text-slate-600">영상을 로드할 수 없습니다.</p>
              </div>
            )}
          </div>

          {/* Video Info Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-slate-200"></div>
            <p className="text-sm text-slate-600">처리 옵션 설정</p>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Settings Cards */}
          <div className="space-y-6">
            {/* Team Selection */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                🏟️ 팀 선택
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                어느 팀의 하이라이트를 추출하시겠습니까?
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

            {/* Highlight Types */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                🎬 하이라이트 타입
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                추출할 하이라이트 타입을 선택하세요. (중복 선택 가능)
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

            {/* Duration Settings */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                ⏱️ 하이라이트 길이 설정
              </h3>
              <div className="space-y-6">
                {/* Min Duration */}
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
                  <p className="text-xs text-slate-500 mt-2">
                    {minDuration}초 이상의 하이라이트만 추출됩니다.
                  </p>
                </div>

                {/* Max Duration */}
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
                  <p className="text-xs text-slate-500 mt-2">
                    {maxDuration}초 이하의 하이라이트만 추출됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence Threshold */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                🎯 신뢰도 임계값
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                이 신뢰도 이상의 하이라이트만 추출됩니다.
              </p>
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
              <p className="text-xs text-slate-500 mt-2">
                높을수록 정확하지만 추출되는 하이라이트가 적을 수 있습니다.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 flex gap-4">
            <Button
              onClick={handleStartProcessing}
              disabled={isProcessing || selectedTypes.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-6 text-lg"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  처리 중...
                </>
              ) : (
                <>
                  처리 시작
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
