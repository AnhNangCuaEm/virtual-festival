'use client'
// this is quiz games page

import Header from "@/components/layout/Header";
import MuteBtn from "@/components/ui/MuteBtn";
import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import quizData from "@/../data/zone_2/data.json";
import Image from "next/image";

interface Question {
    id: number;
    question: string;
    hint: string;
    answers: string[];
    correct_answer: string;
    scores: number[];
}

type StateType = "start" | "quiz" | "result";

export default function Page() {
    const [QData, setQData] = useState<Question[]>([]);
    const [currentState, setCurrentState] = useState<StateType>("start");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [miniTimer, setMiniTimer] = useState(15);
    const [totalTimer, setTotalTimer] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    const miniTimerRef = useRef<NodeJS.Timeout | null>(null);
    const totalTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingTimeout = useRef<boolean>(false);

    // Load and shuffle questions
    useEffect(() => {
        const shuffled = [...quizData].sort(() => Math.random() - 0.5);
        setQData(shuffled);
    }, []);

    const moveToNextQuestion = useCallback(() => {
        
        // Check if we should move to next question or end quiz
        if (currentQuestionIndex < QData.length - 1) {
            // Still have more questions, move to next
            // Reset state in batch
            setCurrentQuestionIndex(prev => {
                return prev + 1;
            });
            setMiniTimer(15);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            console.log('Quiz finished, going to result');
            // This was the last question, go to result
            setCurrentState("result");
            // Clear timers when quiz ends
            if (miniTimerRef.current) clearInterval(miniTimerRef.current);
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        }
    }, [currentQuestionIndex, QData.length]);

    const handleTimeout = useCallback(() => {
        // Prevent double timeout calls
        if (isProcessingTimeout.current) {
            return;
        }
        
        isProcessingTimeout.current = true;
        
        // When timeout, show correct answer briefly then move to next (no points added)
        setIsAnswered(true);
        // Don't set selectedAnswer - this marks it as a timeout
        
        // Wait 1.5 seconds before moving to next question (same as when answering)
        setTimeout(() => {
            isProcessingTimeout.current = false; // Reset flag
            moveToNextQuestion();
        }, 1500);
    }, [moveToNextQuestion]);

    // Mini timer countdown (15 seconds per question)
    useEffect(() => {
        
        if (currentState === "quiz" && !isAnswered) {
            miniTimerRef.current = setInterval(() => {
                setMiniTimer(prev => {
                    if (prev <= 1) {
                        handleTimeout();
                        return 15;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            // Clear mini timer if not in quiz state
        }

        return () => {
            if (miniTimerRef.current) {
                clearInterval(miniTimerRef.current);
            }
        };
    }, [currentState, currentQuestionIndex, isAnswered, miniTimer, handleTimeout]);

    // Total timer (counts up from start to end)
    useEffect(() => {
        if (currentState === "quiz") {
            totalTimerRef.current = setInterval(() => {
                setTotalTimer(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (totalTimerRef.current) clearInterval(totalTimerRef.current);
        };
    }, [currentState]);

    const handleAnswerClick = (answer: string) => {
        if (isAnswered) return;

        setSelectedAnswer(answer);
        setIsAnswered(true);

        const currentQuestion = QData[currentQuestionIndex];
        const isCorrect = answer === currentQuestion.correct_answer;

        if (isCorrect) {
            // Calculate score based on remaining time
            const timeLeft = miniTimer;
            let score = 0;

            if (timeLeft > 12) score = currentQuestion.scores[4]; // 20 points
            else if (timeLeft > 9) score = currentQuestion.scores[3]; // 15 points
            else if (timeLeft > 6) score = currentQuestion.scores[2]; // 12 points
            else if (timeLeft > 3) score = currentQuestion.scores[1]; // 7 points
            else score = currentQuestion.scores[0]; // 3 points

            setTotalScore(prev => prev + score);
        }

        // Wait 1.5 seconds before moving to next question
        setTimeout(() => {
            moveToNextQuestion();
        }, 1500);
    };

    const startQuiz = () => {
        setCurrentState("quiz");
        setCurrentQuestionIndex(0);
        setMiniTimer(15);
        setTotalTimer(0);
        setTotalScore(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
    };

    const restartQuiz = () => {
        // Reshuffle questions
        const shuffled = [...QData].sort(() => Math.random() - 0.5);
        setQData(shuffled);
        startQuiz();
    };

    const fadeVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                            <h1 className="text-3xl font-bold">山手線クイズ</h1>
                            <p className="text-lg font-semibold text-gray-900 max-w-md">
                                山手線について{QData.length}問のクイズです。<br />
                                各問題は15秒以内に答えてください。<br />
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
                // Check if we have a valid question
                if (!QData[currentQuestionIndex]) {
                    // If no question exists, it means we're transitioning to result
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
                                <div className={`w-24 px-4 py-2 rounded-lg font-bold ${miniTimer <= 5 ? 'bg-red-500/60 text-white' : 'bg-blue-500/60 text-white'
                                    }`}>
                                    ⏱️ {miniTimer}秒
                                </div>
                            </div>
                        </div>

                        {/* Question */}
                        <div className="w-full h-60 p-4 bg-gradient-to-r bg-gray-200/80 rounded-2xl overflow-hidden relative">
                            <Image
                                src={`/images/zone_2/zone_2_bg.jpg`}
                                alt="Question Image"
                                fill
                                className="object-cover absolute inset-0 blur-xs"
                                priority
                            />
                            <div className="relative z-10 flex flex-col justify-center h-full">
                                <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-lg">
                                    {currentQuestion.question}
                                </h2>
                                <p className="text-md text-white italic drop-shadow-lg">
                                    <strong>ヒント: </strong>{currentQuestion.hint}
                                </p>
                            </div>
                        </div>

                        {/* Answers */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            {currentQuestion.answers.map((answer, index) => {
                                const isSelected = selectedAnswer === answer;
                                const isCorrect = answer === currentQuestion.correct_answer;
                                const showResult = isAnswered;
                                const isTimeout = isAnswered && !selectedAnswer; // Timeout case

                                let buttonClass = "p-6 border-2 rounded-lg font-semibold transition-all ";

                                if (!showResult) {
                                    buttonClass += "border-gray-300 hover:border-violet-500";
                                } else if (isTimeout) {
                                    // Timeout: only highlight correct answer
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

                        {/* Score display */}
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
                            <p className="text-6xl font-bold text-purple-600">{totalScore}<span className="text-2xl text-black">点</span></p>
                            <p className="text-xl text-black">
                                所要時間: {formatTime(totalTimer)}
                            </p>
                            <p className="text-lg text-black">
                                {totalScore >= 150 ? "素晴らしい！山手線マスターです！" :
                                    totalScore >= 100 ? "よくできました！" :
                                        totalScore >= 50 ? "もう少し頑張りましょう！" :
                                            totalScore > 0 ? "次回はもっと頑張りましょう！" :
                                                "残念！次はもっと速く答えてみましょう！"}
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
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
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
            <main className="flex flex-col items-center justify-center w-full flex-1 px-8 text-center">
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </main>
        </div>
    );
}