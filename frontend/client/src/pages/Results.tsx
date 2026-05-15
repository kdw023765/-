import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Film, Home, Download, Play, Zap, X } from "lucide-react";
import { toast } from "sonner";
import type { Highlight } from "@shared/types";

export default function Results() {
  const [, navigate] = useLocation();
  const { videoId } = useParams<{ videoId: string }>();
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  const videoQuery = trpc.video.getStatus.useQuery(
    { videoId: parseInt(videoId || "0") },
    { enabled: !!videoId }
  );

  const highlightsQuery = trpc.highlight.listByVideo.useQuery(
    { videoId: parseInt(videoId || "0") },
    { enabled: !!videoId }
  );

  const video = videoQuery.data;
  const highlights = highlightsQuery.data || [];

  const getHighlightTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      goal: "⚽ 골",
      post: "🎯 골대 맞고 나감",
      foul: "🚩 파울",
    };
    return labels[type] || type;
  };

  const getHighlightTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      goal: "bg-green-100 text-green-700 border-green-300",
      post: "bg-yellow-100 text-yellow-700 border-yellow-300",
      foul: "bg-red-100 text-red-700 border-red-300",
    };
    return colors[type] || "bg-slate-100 text-slate-700 border-slate-300";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDownload = (highlight: Highlight) => {
    if (highlight.clipUrl) {
      const link = document.createElement("a");
      link.href = highlight.clipUrl;
      link.download = `highlight_${highlight.type}_${highlight.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`하이라이트 다운로드 시작: ${getHighlightTypeLabel(highlight.type)}`);
    } else {
      toast.error("다운로드 링크를 사용할 수 없습니다.");
    }
  };

  const handlePlayHighlight = (highlight: Highlight) => {
    setSelectedHighlight(highlight);
    setShowPlayer(true);
  };

  if (videoQuery.isLoading) {
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

      {/* Video Player Modal */}
      {showPlayer && selectedHighlight && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="relative bg-black aspect-video flex items-center justify-center">
              <video
                key={selectedHighlight.id}
                controls
                autoPlay
                className="w-full h-full"
                src={selectedHighlight.clipUrl || undefined}
              >
                <p>브라우저가 비디오를 지원하지 않습니다.</p>
              </video>
              <button
                onClick={() => setShowPlayer(false)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6 text-slate-900" />
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {getHighlightTypeLabel(selectedHighlight.type)}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {formatTime(selectedHighlight.startTime)} ~ {formatTime(selectedHighlight.endTime)}
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDownload(selectedHighlight)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </Button>
                <Button
                  onClick={() => setShowPlayer(false)}
                  variant="outline"
                  className="flex-1"
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container py-12 md:py-20">
        {/* Video Info */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {video.fileName}
                </h2>
                <p className="text-slate-600 text-sm">
                  업로드: {new Date(video.createdAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                video.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : video.status === "processing"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-700"
              }`}>
                {video.status === "completed" && "✓ 완료"}
                {video.status === "processing" && "⏳ 처리 중"}
                {video.status === "pending" && "⏸ 대기 중"}
                {video.status === "failed" && "✗ 실패"}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <p className="text-sm text-slate-600 mb-1">파일 크기</p>
                <p className="text-lg font-semibold text-slate-900">
                  {video.fileSize ? (video.fileSize / (1024 * 1024)).toFixed(2) : "—"} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">영상 길이</p>
                <p className="text-lg font-semibold text-slate-900">
                  {video.duration ? formatTime(video.duration) : "—"}
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

        {/* Highlights Grid */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-6">
            추출된 하이라이트
          </h3>

          {highlights.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
              <Zap className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                추출된 하이라이트가 없습니다.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {highlights.map((highlight) => (
                <div
                  key={highlight.id}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div
                    className="bg-gradient-to-br from-slate-200 to-slate-300 h-40 flex items-center justify-center relative group cursor-pointer"
                    onClick={() => handlePlayHighlight(highlight)}
                  >
                    <Play className="w-12 h-12 text-white opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getHighlightTypeColor(highlight.type)}`}>
                        {getHighlightTypeLabel(highlight.type)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        신뢰도: {highlight.confidence}%
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">시작</span>
                        <span className="font-semibold text-slate-900">
                          {formatTime(highlight.startTime)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">종료</span>
                        <span className="font-semibold text-slate-900">
                          {formatTime(highlight.endTime)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">길이</span>
                        <span className="font-semibold text-slate-900">
                          {highlight.endTime - highlight.startTime}초
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePlayHighlight(highlight)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        재생
                      </Button>
                      <Button
                        onClick={() => handleDownload(highlight)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        다운로드
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
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
