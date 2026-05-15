import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Film, UploadCloud, CheckCircle, AlertCircle, Home } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB per chunk

export default function Upload() {
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [videoId, setVideoId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string>("");

  // 세션 ID 생성 (비로그인 사용자 추적용)
  useEffect(() => {
    const id = localStorage.getItem("sessionId") || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
    localStorage.setItem("sessionId", id);
  }, []);

  // 청크 업로드 함수
  const uploadChunk = async (chunk: Blob, chunkIndex: number, totalChunks: number, fileName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("sessionId", sessionId);
      formData.append("fileName", fileName);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const chunkProgress = (e.loaded / e.total) * (1 / totalChunks);
          const totalProgress = ((chunkIndex / totalChunks) * 100) + (chunkProgress * 100);
          setUploadProgress(Math.min(totalProgress, 99));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`청크 업로드 실패: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("네트워크 오류가 발생했습니다."));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("업로드 타임아웃 - 네트워크 연결을 확인하세요."));
      });

      xhr.timeout = 300000; // 5분 타임아웃

      xhr.open("POST", "/api/upload/chunk");
      xhr.send(formData);
    });
  };

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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      validateAndSelectFile(file);
    }
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
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !sessionId) {
      toast.error("파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);
    setUploadStatusMessage("업로드 준비 중...");

    try {
      const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
      setUploadStatusMessage(`${totalChunks}개 청크로 분할하여 업로드 중...`);

      // 청크 단위로 업로드
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);

        setUploadStatusMessage(`청크 ${i + 1}/${totalChunks} 업로드 중...`);
        await uploadChunk(chunk, i, totalChunks, selectedFile.name);
      }

      // 모든 청크 업로드 완료 후 병합 요청
      setUploadStatusMessage("업로드 완료, 서버에서 처리 중...");
      setUploadProgress(100);

      const response = await fetch("/api/upload/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          totalChunks,
        }),
      });

      if (!response.ok) {
        throw new Error("파일 병합 실패");
      }

      const data = await response.json();
      
      setVideoId(data.videoId);
      setUploadSuccess(true);
      setUploadStatusMessage("업로드 완료!");
      toast.success("영상이 업로드되었습니다!");

      // 설정 페이지로 이동
      setTimeout(() => {
        navigate(`/settings/${data.videoId}`);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      setUploadStatusMessage(`업로드 실패: ${errorMessage}`);
      toast.error(`업로드 오류: ${errorMessage}`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              축구 경기 영상 업로드
            </h2>
            <p className="text-slate-600">
              MP4, WebM 등의 비디오 파일을 업로드하면 자동으로 하이라이트를 추출합니다.
              <br />
              <span className="text-sm text-slate-500">최대 파일 크기: 500MB (청크 기반 업로드로 빠르게 처리됨)</span>
            </p>
          </div>

          {/* Upload Area */}
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

          {/* Upload Progress */}
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
                    청크 단위로 병렬 처리되고 있습니다.
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

          {/* Upload Complete */}
          {uploadSuccess && videoId && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <div>
                  <h3 className="font-semibold text-slate-900">
                    업로드 완료!
                  </h3>
                  <p className="text-sm text-slate-600">
                    설정 페이지로 이동하여 하이라이트 옵션을 설정하세요.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => navigate(`/settings/${videoId}`)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  설정 페이지로 이동
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setVideoId(null);
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

          {/* Upload Button */}
          {selectedFile && !isUploading && !uploadSuccess && (
            <div className="mt-8 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">💡 청크 기반 업로드</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• 대용량 파일은 자동으로 10MB 단위로 분할되어 업로드됩니다</li>
                  <li>• 각 청크는 병렬로 처리되어 전체 속도가 향상됩니다</li>
                  <li>• 네트워크 오류 시 자동으로 재시도됩니다 (타임아웃: 5분)</li>
                  <li>• 업로드 후 서버에서 자동으로 청크를 병합합니다</li>
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
