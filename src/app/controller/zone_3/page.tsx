"use client";

import Header from "@/components/layout/Header";
import MuteBtn from "@/components/ui/MuteBtn";
import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import quizData from "@/../data/zone_3/data.json";
import Image from "next/image";

interface Question {
  id: number;
  station: string;
  sound: string;
  hint_1: string;
  answers: string[];
  correct_answer: string;
  scores: number[];
}

type StateType = "start" | "quiz" | "result";

export default function Page() {
  const [QData, setQData] = useState<Question[]>([]);
  const [currentState, setCurrentState] = useState<StateType>("start");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [miniTimer, setMiniTimer] = useState(30);
  const [totalTimer, setTotalTimer] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedAudio, setHasPlayedAudio] = useState(false);
  const [hasStartedGame, setHasStartedGame] = useState(false);

  const volume = 0.8;

  const miniTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingTimeout = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setQData(quizData);
  }, []);

  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const currentQuestion = QData[currentQuestionIndex];
    if (currentQuestion) {
      const audio = new Audio(currentQuestion.sound);
      audio.volume = volume;
      audio.loop = true;
      audioRef.current = audio;

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Error playing audio:", error);
        });
    }
  }, [currentQuestionIndex, QData, volume]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [currentQuestionIndex, stopAudio]);

  const toggleAudio = () => {
    if (!audioRef.current) {
      playAudio();
      setHasPlayedAudio(true);
      setHasStartedGame(true);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      setHasPlayedAudio(true);
      setHasStartedGame(true);
    }
  };

  const replayAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      setHasPlayedAudio(true);
      setHasStartedGame(true);
    } else {
      playAudio();
      setHasPlayedAudio(true);
      setHasStartedGame(true);
    }
  };

  const moveToNextQuestion = useCallback(() => {
    stopAudio();

    if (currentQuestionIndex < QData.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setMiniTimer(30);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setHasPlayedAudio(false);
    } else {
      setCurrentState("result");
      if (miniTimerRef.current) clearInterval(miniTimerRef.current);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    }
  }, [currentQuestionIndex, QData.length, stopAudio]);

  const handleTimeout = useCallback(() => {
    if (isProcessingTimeout.current) {
      return;
    }

    isProcessingTimeout.current = true;
    setIsAnswered(true);

    setTimeout(() => {
      isProcessingTimeout.current = false;
      moveToNextQuestion();
    }, 2200);
  }, [moveToNextQuestion]);

  useEffect(() => {
    if (currentState === "quiz" && !isAnswered && hasPlayedAudio) {
      miniTimerRef.current = setInterval(() => {
        setMiniTimer((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (miniTimerRef.current) {
        clearInterval(miniTimerRef.current);
      }
    };
  }, [
    currentState,
    currentQuestionIndex,
    isAnswered,
    miniTimer,
    handleTimeout,
    hasPlayedAudio,
  ]);

  useEffect(() => {
    if (currentState === "quiz" && hasStartedGame && hasPlayedAudio) {
      totalTimerRef.current = setInterval(() => {
        setTotalTimer((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
    };
  }, [currentState, hasStartedGame, hasPlayedAudio]);

  const handleAnswerClick = (answer: string) => {
    if (isAnswered) return;
    if (!hasPlayedAudio) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);

    const currentQuestion = QData[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;

    if (isCorrect) {
      const timeLeft = miniTimer;
      let score = 0;

      if (timeLeft > 20) score = currentQuestion.scores[4];
      else if (timeLeft > 15) score = currentQuestion.scores[3];
      else if (timeLeft > 10) score = currentQuestion.scores[2];
      else if (timeLeft > 5) score = currentQuestion.scores[1];
      else score = currentQuestion.scores[0];

      setTotalScore((prev) => prev + score);
    }

    setTimeout(() => {
      moveToNextQuestion();
    }, 3000);
  };

  const startQuiz = () => {
    setCurrentState("quiz");
    setCurrentQuestionIndex(0);
    setMiniTimer(30);
    setTotalTimer(0);
    setTotalScore(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setHasPlayedAudio(false);
    setHasStartedGame(false);
  };

  const restartQuiz = () => {
    const shuffled = [...QData].sort(() => Math.random() - 0.5);
    setQData(shuffled);
    startQuiz();
  };

  const fadeVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderContent = () => {
    switch (currentState) {
      case "start":
        return (
          <motion.div
            key="start"
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-6"
          >
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-2xl">
              <h1 className="text-3xl font-bold">東京電車の音クイズ</h1>
              <p className="text-lg font-semibold text-gray-900 max-w-md">
                車内アナウンスを聞いて路線名を当てましょう！
                <br />
                各路線のアナウンスは声が少し違います。
                <br />
                {QData.length}問のクイズです。
                <br />
                各問題は30秒以内に答えてください。
                <br />
                早く答えるほど高得点！
              </p>
            </div>
            <button
              onClick={startQuiz}
              className="px-8 py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 transition-colors"
            >
              スタート
            </button>
          </motion.div>
        );

      case "quiz":
        if (!QData[currentQuestionIndex]) {
          return null;
        }
        const currentQuestion = QData[currentQuestionIndex];

        return (
          <motion.div
            key={`quiz-${currentQuestionIndex}`}
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center space-y-6 w-full max-w-3xl"
          >
            {/* Timers */}
            <div className="w-full flex justify-between items-center px-4">
              <div className="text-lg font-semibold">
                問題 {currentQuestionIndex + 1}/{QData.length}
              </div>
              <div className="flex gap-4">
                <div
                  className={`w-24 px-4 py-2 rounded-lg font-bold ${
                    miniTimer <= 5
                      ? "bg-red-500/60 text-white"
                      : "bg-blue-500/60 text-white"
                  }`}
                >
                  ⏱️ {miniTimer}秒
                </div>
              </div>
            </div>

            {/* Question with Audio Controls */}
            <div className="w-full p-6 bg-gray-200/80 rounded-2xl overflow-hidden relative">
              <Image
                src={`/images/zone_2/zone_3_bg.jpeg`}
                fill
                alt="Train Background"
                className="object-cover absolute inset-0 blur-sm"
                priority
              />
              <div className="relative z-10 flex flex-col items-center space-y-4">
                <h2 className="text-2xl font-bold text-white text-center drop-shadow-lg">
                  {currentQuestion.station}到着の車内アナウンス
                </h2>
                <p className="text-lg font-bold text-white text-center drop-shadow-lg mb-2">
                  どの路線でしょうか？
                </p>
                <p className="text-md text-white italic drop-shadow-lg">
                  <strong>ヒント: </strong>
                  {currentQuestion.hint_1}
                </p>

                <div className="relative w-full max-w-md bg-white/20 p-6 rounded-lg">
                  <button
                    onClick={replayAudio}
                    className="absolute top-3 right-3 p-2 bg-gray-200/80 rounded-full hover:bg-gray-300/80 transition-colors flex items-center justify-center"
                    title="最初から再生"
                  >
                    <Image
                      src="/images/zone_3/refresh-svgrepo-com.svg"
                      alt="Refresh"
                      width={24}
                      height={24}
                    />
                  </button>

                  <div className="flex justify-center">
                    <button
                      onClick={toggleAudio}
                      className="p-4 bg-gray-200/80 rounded-full hover:bg-gray-300/80 transition-colors flex items-center justify-center shadow-lg"
                      title={isPlaying ? "一時停止" : "再生"}
                    >
                      {isPlaying ? (
                        <Image
                          src="/images/zone_3/pause-circle-svgrepo-com.svg"
                          alt="Pause"
                          width={64}
                          height={64}
                        />
                      ) : (
                        <Image
                          src="/images/zone_3/play-svgrepo-com.svg"
                          alt="Play"
                          width={64}
                          height={64}
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Answers */}
            <div className="grid grid-cols-2 gap-4 w-full">
              {currentQuestion.answers.map((answer, index) => {
                const isSelected = selectedAnswer === answer;
                const isCorrect = answer === currentQuestion.correct_answer;
                const showResult = isAnswered;
                const isTimeout = isAnswered && !selectedAnswer;

                let buttonClass =
                  "p-6 border-2 rounded-lg font-semibold transition-all ";

                if (!showResult) {
                  buttonClass += "border-gray-300 hover:border-violet-500";
                } else if (isTimeout) {
                  if (isCorrect) {
                    buttonClass += "border-green-500 text-green-700";
                  } else {
                    buttonClass += "border-gray-300 opacity-50";
                  }
                } else if (isSelected) {
                  buttonClass += isCorrect
                    ? "border-green-500 text-green-700"
                    : "border-red-500 text-red-700";
                } else if (isCorrect) {
                  buttonClass += "border-green-500 text-green-700";
                } else {
                  buttonClass += "border-gray-300 opacity-50";
                }

                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    onClick={() => handleAnswerClick(answer)}
                    disabled={isAnswered}
                    className={buttonClass}
                  >
                    {answer}
                  </motion.button>
                );
              })}
            </div>

            <div className="px-4 py-2 bg-gray-700 text-white rounded-lg font-bold">
              合計: {formatTime(totalTimer)}
            </div>

            <div className="text-xl font-bold text-purple-600">
              現在のスコア: {totalScore}点
            </div>
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
            className="flex flex-col items-center space-y-6"
          >
            <h1 className="text-4xl font-bold">結果</h1>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="w-full max-w-2xl p-8 bg-gray-200/80 rounded-2xl flex flex-col items-center justify-center space-y-4"
            >
              <p className="text-6xl font-bold text-purple-600">
                {totalScore}
                <span className="text-2xl text-black">点</span>
              </p>
              <p className="text-xl text-black">
                所要時間: {formatTime(totalTimer)}
              </p>
              <p className="text-lg text-black">
                {totalScore >= 150
                  ? "素晴らしい！駅メロマスターです！"
                  : totalScore >= 100
                  ? "よくできました！"
                  : totalScore >= 50
                  ? "もう少し頑張りましょう！"
                  : totalScore > 0
                  ? "次回はもっと頑張りましょう！"
                  : "残念！次はもっと速く答えてみましょう！"}
              </p>
            </motion.div>
            <button
              onClick={restartQuiz}
              className="px-8 py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 transition-colors"
            >
              もう一度挑戦
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 backdrop-blur-sm">
      <Header />
      <div className="w-full h-16 flex items-center justify-between px-8">
        <Link href="/controller">
          <button className="p-2 px-6 bg-gray-200/80 rounded-lg text-black font-semibold">
            Back
          </button>
        </Link>
        <MuteBtn />
      </div>
      <main className="flex flex-col items-center justify-center w-full flex-1 px-8 text-center">
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </main>
    </div>
  );
}
