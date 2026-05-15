import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadVideo, saveRecentJob } from "@/lib/backendApi";
import { Film, UploadCloud, CheckCircle, Home } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export default function Upload() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>("");

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) validateAndSelectFile(file);
  };

  const validateAndSelectFile = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("비디오 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`파일 크기는 500MB 이하여야 합니다. (현재: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }

    setSelectedFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) validateAndSelectFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setUploadSuccess(false);
    setUploadStatusMessage("백엔드로 영상을 업로드하는 중...");

    try {
      const job = await uploadVideo(selectedFile);

      saveRecentJob({
        job_id: job.job_id,
        filename: selectedFile.name,
        uploadedAt: new Date().toISOString(),
        status: job.status,
      });

      setJobId(job.job_id);
      setUploadProgress(100);
      setUploadSuccess(true);
      setUploadStatusMessage(job.message || "업로드가 접수되었습니다.");
      toast.success("영상이 업로드되었습니다!");

      setTimeout(() => {
        navigate(`/settings/${job.job_id}`);
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      setUploadStatusMessage(`업로드 실패: ${errorMessage}`);
      toast.error(`업로드 오류: ${errorMessage}`);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              축구 경기 영상 업로드
            </h2>
            <p className="text-slate-600">
              MP4, WebM 등의 비디오 파일을 업로드하면 자동으로 하이라이트를 추출합니다.
              <br />
              <span className="text-sm text-slate-500">최대 파일 크기: 500MB</span>
            </p>
          </div>

          {!isUploading && !uploadSuccess ? (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 hover:border-slate-400 bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                  <UploadCloud className="w-8 h-8 text-blue-600" />
                </div>

                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-900">
                      여기에 영상을 드래그하세요
                    </p>
                    <p className="text-sm text-slate-600">
                      또는 아래 버튼을 클릭하여 파일을 선택하세요
                    </p>
                  </div>
                )}

                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="mt-4"
                >
                  파일 선택
                </Button>
              </div>
            </div>
          ) : null}

          {isUploading && !uploadSuccess && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                  <UploadCloud className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    파일 업로드 중...
                  </h3>
                  <p className="text-sm text-slate-600">
                    백엔드 API로 파일을 전송하고 있습니다.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    업로드 진행률
                  </span>
                  <span className="text-sm font-semibold text-blue-600">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <Progress value={uploadProgress} />
              </div>

              <p className="text-sm text-slate-600 text-center">
                {uploadStatusMessage || "이 페이지를 닫지 마세요."}
              </p>
            </div>
          )}

          {uploadSuccess && jobId && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <div>
                  <h3 className="font-semibold text-slate-900">
                    업로드 완료!
                  </h3>
                  <p className="text-sm text-slate-600">
                    설정 페이지로 이동하여 하이라이트 옵션을 확인하세요.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => navigate(`/settings/${jobId}`)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  설정 페이지로 이동
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setJobId(null);
                    setUploadProgress(0);
                    setUploadSuccess(false);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  다른 영상 업로드
                </Button>
              </div>
            </div>
          )}

          {selectedFile && !isUploading && !uploadSuccess && (
            <div className="mt-8 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">업로드 안내</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>백엔드의 /api/upload 엔드포인트로 영상 파일을 전송합니다.</li>
                  <li>업로드 후 생성된 작업 ID로 처리 상태를 확인합니다.</li>
                  <li>실제 하이라이트 분석은 백엔드와 MasterNode가 담당합니다.</li>
                </ul>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  업로드 시작
                </Button>
                <Button
                  onClick={() => setSelectedFile(null)}
                  variant="outline"
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
