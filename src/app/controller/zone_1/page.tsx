"use client";

import Header from "@/components/layout/Header";
import MuteBtn from "@/components/ui/MuteBtn";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type StateType = "guide" | "preview" | "choose-style" | "result";

export default function Page() {
  const [currentState, setCurrentState] = useState<StateType>("guide");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup stream when leaving preview state
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    };
  }, [stream]);

  // Reset camera state when leaving preview
  useEffect(() => {
    if (currentState !== "preview") {
      setCameraInitialized(false);
      setIsCameraReady(false);
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [currentState, stream]);

  const startCamera = async () => {
    try {
      setIsLoadingCamera(true);
      setCameraError(null);
      setIsCameraReady(false);
      setCapturedImage(null);

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Check if in secure context (HTTPS)
      if (!window.isSecureContext) {
        throw new Error(
          "Camera requires HTTPS. Please access this site via https:// or see FIX-CAMERA.md for setup instructions."
        );
      }

      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Camera API is not supported. Make sure you are using HTTPS (https://...) not HTTP."
        );
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
          setIsLoadingCamera(false);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      let errorMessage = "カメラにアクセスできません。権限を確認してください。";

      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "カメラの権限が拒否されました。ブラウザの設定でカメラへのアクセスを許可してください。";
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          errorMessage = "デバイスにカメラが見つかりません。";
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          errorMessage = "カメラは別のアプリケーションで使用されています。";
        } else if (err.message) {
          errorMessage = err.message;
        }
      }

      setCameraError(errorMessage);
      setIsLoadingCamera(false);
    }
  };

  const fadeVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image horizontally
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageDataUrl);

    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  const retakeImage = () => {
    setCapturedImage(null);

    // Ensure video is playing
    if (videoRef.current && stream && stream.active) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("Error playing video:", err);
        // If play fails, restart camera
        startCamera();
      });
    } else {
      // Stream not active, need to restart
      startCamera();
    }
  };

  const confirmImage = () => {
    setCurrentState("choose-style");
  };

  const generateKimono = async (style: string) => {
    if (!capturedImage) return;

    setIsGenerating(true);
    setSelectedStyle(style);

    try {
      const base64Image = capturedImage.split(",")[1];

      const response = await fetch("/api/generate-kimono", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          style: style,
        }),
      });

      const data = await response.json();

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setCurrentState("result");
      } else {
        alert(`エラー: ${data.error || "画像生成に失敗しました"}`);
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("エラー: 画像生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    switch (currentState) {
      case "guide":
        return (
          <motion.div
            key="guide"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-6"
          >
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-2xl">
              <h1 className="text-2xl font-bold">着物試着へようこそ</h1>
              <p className="text-lg text-gray-900 max-w-md">
                顔写真を撮って
                <br />
                AIで処理して写真
                <br />
                を返します
              </p>
            </div>
            <button
              onClick={() => {
                setCurrentState("preview");
                setCameraInitialized(false);
              }}
              className="px-8 py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 transition-colors"
            >
              始める
            </button>
          </motion.div>
        );

      case "preview":
        return (
          <motion.div
            key="preview"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-6 w-full max-w-md mx-auto"
          >
            {/* Camera/Image Container */}
            <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden">
              {capturedImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={capturedImage}
                  alt="撮影した写真"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  {/* Camera Not Started - Show Enable Button */}
                  {!cameraInitialized && !cameraError && (
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 flex flex-col items-center justify-center p-6 text-center z-10">
                      <div className="bg-white/10 backdrop-blur-sm rounded-full p-6 mb-4">
                        <svg
                          className="w-16 h-16 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-white text-xl font-bold mb-2">
                        カメラを有効にする
                      </h3>
                      <p className="text-white/90 mb-6 max-w-xs">
                        下のボタンをクリックしてカメラにアクセスしてください
                      </p>
                      <button
                        onClick={() => {
                          setCameraInitialized(true);
                          startCamera();
                        }}
                        className="px-8 py-3 bg-white text-violet-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors shadow-lg"
                      >
                        カメラを有効にする
                      </button>
                    </div>
                  )}

                  {/* Loading Overlay */}
                  {isLoadingCamera && (
                    <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="flex flex-col items-center text-white">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p>カメラを読み込み中...</p>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center p-6 text-center z-10">
                      <svg
                        className="w-12 h-12 text-red-500 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="text-red-600 mb-4 text-sm">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        再試行
                      </button>
                    </div>
                  )}

                  {/* Video Stream */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </>
              )}

              {/* Hidden Canvas */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 w-full">
              {capturedImage ? (
                <>
                  <button
                    onClick={retakeImage}
                    className="flex-1 py-3 px-6 bg-gray-200 text-gray-800 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                  >
                    撮り直す
                  </button>
                  <button
                    onClick={confirmImage}
                    className="flex-1 py-3 px-6 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition-colors"
                  >
                    確定
                  </button>
                </>
              ) : (
                <button
                  onClick={captureImage}
                  disabled={!isCameraReady || isLoadingCamera}
                  className="w-full py-3 px-6 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  写真を撮る
                </button>
              )}
            </div>
          </motion.div>
        );

      case "choose-style":
        return (
          <motion.div
            key="choose-style"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-6"
          >
            <h1 className="text-4xl text-white font-bold">
              着物スタイルを選択
            </h1>
            {isGenerating ? (
              <div className="flex flex-col items-center space-y-4 py-12">
                <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg text-gray-700">画像を生成中...</p>
                <p className="text-sm text-gray-500">
                  30-60秒かかる場合があります
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  {["Anime", "Art", "Fantasy", "Ghibli"].map((style, index) => (
                    <motion.button
                      key={style}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      onClick={() => generateKimono(style)}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-violet-500 transition-colors bg-gray-800"
                    >
                      <span className="text-xl font-semibold text-white">
                        {style}
                      </span>
                    </motion.button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentState("preview")}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  戻る
                </button>
              </>
            )}
          </motion.div>
        );

      case "result":
        return (
          <motion.div
            key="result"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-6 w-full max-w-2xl"
          >
            <h1 className="text-4xl text-white font-bold">着物姿が完成！</h1>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="w-full rounded-2xl overflow-hidden shadow-2xl"
            >
              {generatedImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={generatedImage}
                  alt="Generated kimono image"
                  className="w-full h-auto"
                />
              ) : (
                <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500">画像がありません</p>
                </div>
              )}
            </motion.div>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  setCurrentState("guide");
                  setGeneratedImage(null);
                  setCapturedImage(null);
                  setSelectedStyle("");
                }}
                className="px-6 py-3 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors font-semibold"
              >
                最初からやり直す
              </button>
              {generatedImage && (
                <a
                  href={generatedImage}
                  download="kimono-result.jpg"
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-center"
                >
                  画像をダウンロード
                </a>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 backdrop-blur-sm">
      <Header />
      {/* Back and mute button */}
      <div className="w-full h-16 flex items-center justify-between px-8">
        <Link href="/controller">
          <button className="p-2 px-6 bg-gray-200/80 rounded-lg text-black font-semibold">
            Back
          </button>
        </Link>
        <MuteBtn />
      </div>
      {/* Main content */}
      <main className="flex flex-col items-center justify-center px-8 w-full flex-1 text-center">
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </main>

      {/* State indicator */}
      {/* <div className="w-full flex justify-center space-x-2 pb-4">
                {["guide", "preview", "choose-style", "result"].map((state, index) => (
                    <div
                        key={state}
                        className={`w-3 h-3 rounded-full ${
                            currentState === state ? "bg-blue-500" : "bg-gray-300"
                        }`}
                    />
                ))}
            </div> */}
    </div>
  );
}
