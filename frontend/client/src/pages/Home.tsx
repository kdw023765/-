import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Film, Play, History, ArrowRight } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200/50 backdrop-blur-sm sticky top-0 z-50 bg-white/80">
        <div className="container h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
              <Film className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Soccer Highlights</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => navigate("/upload")}
              className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              업로드
            </button>
            <button
              onClick={() => navigate("/history")}
              className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              이력
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              축구 경기의
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {" "}하이라이트
              </span>
              를 자동으로 추출하세요
            </h2>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
              AI 기반 분석으로 골, 골대 맞고 나간 장면, 파울을 자동 감지하고
              <br className="hidden md:block" />
              하이라이트 영상을 즉시 생성합니다.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button
              onClick={() => navigate("/upload")}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Play className="w-5 h-5 mr-2" />
              지금 시작하기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              onClick={() => navigate("/history")}
              variant="outline"
              size="lg"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <History className="w-5 h-5 mr-2" />
              최근 처리 내역
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 pt-16">
            {[
              {
                icon: "🎬",
                title: "드래그 앤 드롭 업로드",
                description: "간단하게 영상을 드래그해서 업로드하세요",
              },
              {
                icon: "⚡",
                title: "빠른 처리",
                description: "AI 분석으로 순식간에 하이라이트를 추출합니다",
              },
              {
                icon: "📊",
                title: "정확한 감지",
                description: "골, 골대 맞고 나간 장면, 파울을 정확히 감지합니다",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 pt-16 border-t border-slate-200">
            {[
              { number: "100%", label: "자동 처리" },
              { number: "초스피드", label: "빠르게 결과물 확인" },
              { number: "용량제한X", label: "용량과 시간 제한 없이!" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {stat.number}
                </div>
                <p className="text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50/50 py-8 mt-20">
        <div className="container text-center text-slate-600 text-sm">
          <p>© 2024 Soccer Highlight Extractor. 모든 권리 보유.</p>
        </div>
      </footer>
    </div>
  );
}
