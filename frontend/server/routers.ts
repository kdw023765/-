import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { createVideo, getVideoById, getVideosBySessionId, updateVideoSettings, updateVideoProgress, createHighlight, getHighlightsByVideoId } from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

/**
 * 백그라운드에서 하이라이트 추출을 비동기로 처리
 * 이 함수는 Promise를 반환하지 않고 백그라운드에서 실행됨
 */
async function processHighlightsInBackground(videoId: number, video: any) {
  try {
    // 시뮬레이션: 단계별 진행
    await new Promise(resolve => setTimeout(resolve, 500));
    await updateVideoProgress(videoId, 15, "processing", "비디오 분석 중...");

    await new Promise(resolve => setTimeout(resolve, 800));
    await updateVideoProgress(videoId, 35, "processing", "장면 감지 중...");

    // 하이라이트 추출
    const simulatedHighlights = generateSimulatedHighlights(
      video.duration || 300,
      video.minHighlightDuration || 5,
      video.maxHighlightDuration || 30,
      video.highlightTypes ? JSON.parse(video.highlightTypes as any) : ["goal", "post", "foul"],
      video.minConfidence || 70
    );

    await new Promise(resolve => setTimeout(resolve, 600));
    await updateVideoProgress(videoId, 65, "processing", "클립 생성 중...");

    // 하이라이트 저장
    for (const highlight of simulatedHighlights) {
      await createHighlight({
        videoId,
        type: highlight.type as any,
        startTime: highlight.startTime,
        endTime: highlight.endTime,
        confidence: highlight.confidence,
        metadata: JSON.stringify(highlight.metadata),
      });
    }

    await new Promise(resolve => setTimeout(resolve, 400));
    await updateVideoProgress(videoId, 90, "processing", "최종 처리 중...");

    await new Promise(resolve => setTimeout(resolve, 300));
    await updateVideoProgress(videoId, 100, "completed", "하이라이트 추출 완료!");
  } catch (error) {
    console.error("[Background Processing] Error:", error);
    await updateVideoProgress(videoId, 0, "failed", "처리 중 오류 발생");
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * 비디오 관련 API
   */
  video: router({
    /**
     * 비디오 업로드 시작
     * 클라이언트에서 파일을 받아 S3에 저장하고 DB에 레코드 생성
     */
    uploadStart: publicProcedure
      .input(z.object({
        fileName: z.string(),
        fileSize: z.number(),
        fileBlob: z.instanceof(Blob),
        sessionId: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Blob을 Buffer로 변환
          const arrayBuffer = await input.fileBlob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // S3에 파일 업로드
          const fileKey = `videos/${nanoid()}/${input.fileName}`;
          const { url: videoUrl } = await storagePut(fileKey, buffer, "video/mp4");

          // DB에 비디오 레코드 생성
          const video = await createVideo({
            fileName: input.fileName,
            videoUrl,
            videoKey: fileKey,
            fileSize: input.fileSize,
            status: "pending",
            progress: 0,
            sessionId: input.sessionId,
            duration: 300, // 기본값
          });

          return {
            success: true,
            videoId: video?.id,
            fileName: input.fileName,
          };
        } catch (error) {
          console.error("[Video Upload] Error:", error);
          throw new Error("비디오 업로드 실패");
        }
      }),

    /**
     * 비디오 상태 조회
     */
    getStatus: publicProcedure
      .input(z.object({
        videoId: z.number(),
      }))
      .query(async ({ input }) => {
        const video = await getVideoById(input.videoId);
        if (!video) {
          throw new Error("비디오를 찾을 수 없습니다");
        }
        return video;
      }),

    /**
     * 비디오 설정 업데이트
     */
    updateSettings: publicProcedure
      .input(z.object({
        videoId: z.number(),
        team: z.string().optional(),
        minHighlightDuration: z.number().optional(),
        maxHighlightDuration: z.number().optional(),
        highlightTypes: z.array(z.string()).optional(),
        minConfidence: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const video = await getVideoById(input.videoId);
          if (!video) {
            throw new Error("비디오를 찾을 수 없습니다");
          }

          // DB에 설정 저장
          await updateVideoSettings(input.videoId, {
            team: input.team,
            minHighlightDuration: input.minHighlightDuration,
            maxHighlightDuration: input.maxHighlightDuration,
            highlightTypes: input.highlightTypes,
            minConfidence: input.minConfidence,
          });

          return {
            success: true,
            videoId: input.videoId,
            settings: {
              team: input.team,
              minHighlightDuration: input.minHighlightDuration,
              maxHighlightDuration: input.maxHighlightDuration,
              highlightTypes: input.highlightTypes,
              minConfidence: input.minConfidence,
            },
          };
        } catch (error) {
          console.error("[Video Settings] Error:", error);
          throw new Error("설정 업데이트 실패");
        }
      }),

    /**
     * 비디오 진행 상태 조회
     */
    getProgress: publicProcedure
      .input(z.object({
        videoId: z.number(),
      }))
      .query(async ({ input }) => {
        const video = await getVideoById(input.videoId);
        if (!video) {
          throw new Error("비디오를 찾을 수 없습니다");
        }
        return {
          id: video.id,
          progress: video.progress,
          status: video.status,
          statusMessage: video.statusMessage,
          updatedAt: video.updatedAt,
        };
      }),

    /**
     * 세션의 모든 비디오 조회
     */
    listBySession: publicProcedure
      .input(z.object({
        sessionId: z.string(),
      }))
      .query(async ({ input }) => {
        const videos = await getVideosBySessionId(input.sessionId);
        return videos;
      }),

    /**
     * 하이라이트 추출 시뮬레이션 시작
     * 비동기 백그라운드 작업으로 처리
     */
    startProcessing: publicProcedure
      .input(z.object({
        videoId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          const video = await getVideoById(input.videoId);
          if (!video) {
            throw new Error("비디오를 찾을 수 없습니다");
          }

          // 처리 시작 상태로 업데이트
          await updateVideoProgress(input.videoId, 0, "processing", "준비 중...");

          // 비동기 백그라운드 처리 시작 (await하지 않음)
          processHighlightsInBackground(input.videoId, video).catch(err => {
            console.error("[Background Processing] Unhandled error:", err);
          });

          return {
            success: true,
            message: "처리가 시작되었습니다. 진행 상태를 조회하세요.",
          };
        } catch (error) {
          console.error("[Video Processing] Error:", error);
          await updateVideoProgress(input.videoId, 0, "failed", "처리 중 오류 발생");
          throw new Error("하이라이트 추출 실패");
        }
      }),
  }),

  /**
   * 하이라이트 관련 API
   */
  highlight: router({
    /**
     * 비디오의 모든 하이라이트 조회
     */
    listByVideo: publicProcedure
      .input(z.object({
        videoId: z.number(),
      }))
      .query(async ({ input }) => {
        const highlights = await getHighlightsByVideoId(input.videoId);
        return highlights;
      }),
  }),
});

export type AppRouter = typeof appRouter;

/**
 * 하이라이트 추출 시뮬레이션 함수
 * 실제 구현에서는 비디오 분석 AI 모델로 대체
 */
function generateSimulatedHighlights(
  duration: number,
  minDuration: number = 5,
  maxDuration: number = 30,
  highlightTypes: string[] = ["goal", "post", "foul"],
  minConfidence: number = 70
) {
  const highlights = [];
  
  // 골 장면 시뮬레이션 (2-3개)
  if (highlightTypes.includes("goal")) {
    const goalCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < goalCount; i++) {
      const startTime = Math.floor(Math.random() * (duration - maxDuration));
      const clipDuration = Math.min(15, maxDuration);
      const endTime = Math.min(startTime + clipDuration, duration);
      if (endTime - startTime >= minDuration) {
        const confidence = 90 + Math.floor(Math.random() * 10);
        if (confidence >= minConfidence) {
          highlights.push({
            type: "goal",
            startTime,
            endTime,
            confidence,
            metadata: { description: `골 장면 ${i + 1}` },
          });
        }
      }
    }
  }

  // 골대 맞고 나간 장면 시뮬레이션 (1-2개)
  if (highlightTypes.includes("post")) {
    const postCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < postCount; i++) {
      const startTime = Math.floor(Math.random() * (duration - maxDuration));
      const clipDuration = Math.min(10, maxDuration);
      const endTime = Math.min(startTime + clipDuration, duration);
      if (endTime - startTime >= minDuration) {
        const confidence = 75 + Math.floor(Math.random() * 20);
        if (confidence >= minConfidence) {
          highlights.push({
            type: "post",
            startTime,
            endTime,
            confidence,
            metadata: { description: `골대 맞고 나간 장면 ${i + 1}` },
          });
        }
      }
    }
  }

  // 파울 장면 시뮬레이션 (1-3개)
  if (highlightTypes.includes("foul")) {
    const foulCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < foulCount; i++) {
      const startTime = Math.floor(Math.random() * (duration - maxDuration));
      const clipDuration = Math.min(8, maxDuration);
      const endTime = Math.min(startTime + clipDuration, duration);
      if (endTime - startTime >= minDuration) {
        const confidence = 70 + Math.floor(Math.random() * 25);
        if (confidence >= minConfidence) {
          highlights.push({
            type: "foul",
            startTime,
            endTime,
            confidence,
            metadata: { description: `파울 장면 ${i + 1}` },
          });
        }
      }
    }
  }

  return highlights.sort((a, b) => a.startTime - b.startTime);
}
