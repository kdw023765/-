import "dotenv/config";
import { createServer } from "http";
import express, { Request, Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import Busboy from "busboy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerStorageProxy } from "./storageProxy";
import { registerOAuthRoutes } from "./oauth";
import { setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) return port;
  }
  return startPort;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // 타임아웃 설정 (10분)
  server.setTimeout(600000);
  server.keepAliveTimeout = 610000;
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));
  
  // 요청별 타임아웃 미들웨어
  app.use((req, res, next) => {
    req.setTimeout(600000);
    res.setTimeout(600000);
    next();
  });
  
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 청크 업로드 엔드포인트
  app.post('/api/upload/chunk', async (req: Request, res: Response) => {
    try {
      const form = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
      let chunkBuffer: Buffer | null = null;
      let chunkIndex = 0;
      let totalChunks = 0;
      let sessionId = '';
      let fileName = '';

      form.on('file', (fieldname: string, file: any, info: any) => {
        if (fieldname === 'chunk') {
          const chunks: Buffer[] = [];
          file.on('data', (data: Buffer) => {
            chunks.push(data);
          });
          file.on('end', () => {
            chunkBuffer = Buffer.concat(chunks);
          });
        }
      });

      form.on('field', (fieldname: string, val: string) => {
        if (fieldname === 'sessionId') sessionId = val;
        if (fieldname === 'chunkIndex') chunkIndex = parseInt(val);
        if (fieldname === 'totalChunks') totalChunks = parseInt(val);
        if (fieldname === 'fileName') fileName = val;
      });

      form.on('close', async () => {
        if (!chunkBuffer || !sessionId) {
          return res.status(400).json({ error: '필수 필드가 없습니다' });
        }
        try {
          const { storagePut } = await import('../storage');
          const chunkKey = `chunks/${sessionId}/${chunkIndex}`;
          await storagePut(chunkKey, chunkBuffer, 'application/octet-stream');
          res.json({
            success: true,
            chunkIndex,
            totalChunks,
          });
        } catch (error) {
          console.error('[Upload Chunk] Error:', error);
          res.status(500).json({ error: '청크 업로드 실패' });
        }
      });

      form.on('error', (error: any) => {
        console.error('[Upload Chunk] Form error:', error);
        res.status(400).json({ error: '파일 업로드 오류' });
      });

      req.pipe(form);
    } catch (error) {
      console.error('[Upload Chunk] Error:', error);
      res.status(500).json({ error: '서버 오류' });
    }
  });

  // 청크 병합 엔드포인트
  app.post('/api/upload/video', async (req: Request, res: Response) => {
    try {
      const { sessionId, fileName, fileSize, totalChunks } = req.body;
      
      if (!sessionId || !fileName || !totalChunks) {
        return res.status(400).json({ error: '필수 필드가 없습니다' });
      }

      try {
        const { storagePut } = await import('../storage');
        const { createVideo } = await import('../db');
        const { nanoid } = await import('nanoid');
        const fs = await import('fs');
        const path = await import('path');
        
        // 로컬 파일시스템에서 청크 직접 읽기
        const uploadDir = path.resolve(process.cwd(), "uploads");
        const chunks: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          try {
            // uploads 폴더에서 청크 파일 직접 읽기
            const chunkDir = path.join(uploadDir, "chunks", sessionId);
            const files = fs.readdirSync(chunkDir).filter((f: string) => f.startsWith(`${i}_`));
            
            if (files.length > 0) {
              const chunkPath = path.join(chunkDir, files[0]);
              const buffer = fs.readFileSync(chunkPath);
              chunks.push(buffer);
              console.log(`[Chunk Merge] Read chunk ${i}/${totalChunks} (${buffer.length} bytes)`);
            } else {
              console.warn(`[Chunk Merge] Chunk ${i} not found in ${chunkDir}`);
            }
          } catch (error) {
            console.error(`[Chunk Merge] Failed to read chunk ${i}:`, error);
          }
        }

        if (chunks.length === 0) {
          return res.status(400).json({ error: '업로드된 청크가 없습니다' });
        }

        // 모든 청크 병합
        const mergedBuffer = Buffer.concat(chunks);
        console.log(`[Chunk Merge] Merged ${chunks.length} chunks, total size: ${mergedBuffer.length} bytes`);

        // 로컬 스토리지에 병합된 파일 저장
        const fileKey = `videos/${nanoid()}/${fileName}`;
        const { url: videoUrl } = await storagePut(fileKey, mergedBuffer, 'video/mp4');

        // DB에 비디오 레코드 생성
        const { createVideo: createVideoDb } = await import('../db');
        const video = await createVideoDb({
          fileName,
          videoUrl,
          videoKey: fileKey,
          fileSize: mergedBuffer.length,
          status: 'pending',
          progress: 0,
          sessionId,
          duration: 300,
        });

        console.log(`[Chunk Merge] Successfully merged ${totalChunks} chunks for video ${video?.id}`);

        res.json({
          success: true,
          videoId: video?.id,
          fileName,
          mergedSize: mergedBuffer.length,
        });
      } catch (error) {
        console.error('[Chunk Merge] Error:', error);
        res.status(500).json({ error: '청크 병합 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류') });
      }
    } catch (error) {
      console.error('[Upload] Error:', error);
      res.status(500).json({ error: '서버 오류' });
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
