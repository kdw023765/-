import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getRecentJobs, removeRecentJob, type StoredJob } from "@/lib/backendApi";
import { Film, Home, Play, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<StoredJob["status"], string> = {
  pending: "대기 중",
  processing: "처리 중",
  done: "완료",
  failed: "실패",
};

const statusColors: Record<StoredJob["status"], string> = {
  pending: "bg-slate-100 text-slate-700",
  processing: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function History() {
  const [, navigate] = useLocation();
  const [jobs, setJobs] = useState<StoredJob[]>([]);

  useEffect(() => {
    setJobs(getRecentJobs());
  }, []);

  const handleDelete = (jobId: string) => {
    removeRecentJob(jobId);
    setJobs(getRecentJobs());
    toast.success("삭제되었습니다.");
  };

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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              처리 이력
            </h2>
            <p className="text-slate-600">
              이 브라우저에서 업로드한 영상과 작업 상태를 확인하세요.
            </p>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">
                아직 처리 이력이 없습니다.
              </p>
              <Button
                onClick={() => navigate("/upload")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                첫 번째 영상 업로드하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.job_id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {job.filename}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {new Date(job.uploadedAt).toLocaleString("ko-KR")}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ml-4 ${statusColors[job.status]}`}>
                          {statusLabels[job.status]}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                          <span className="text-slate-600">작업 ID:</span>
                          <span className="ml-2 font-medium text-slate-900">
                            {job.job_id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => navigate(job.status === "done" ? `/results/${job.job_id}` : `/processing/${job.job_id}`)}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        열기
                      </Button>
                      <Button
                        onClick={() => handleDelete(job.job_id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {jobs.length > 0 && (
            <div className="mt-8">
              <Button
                onClick={() => navigate("/upload")}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                새 영상 업로드
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
