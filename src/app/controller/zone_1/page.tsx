'use client'

import Header from "@/components/layout/Header";
import MuteBtn from "@/components/ui/MuteBtn";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type StateType = "guide" | "preview" | "choose-style" | "result";

export default function Page() {
    const [currentState, setCurrentState] = useState<StateType>("guide");

    const fadeVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
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
                            <h1 className="text-2xl font-bold">Welcome to <br /> Kimono try-on</h1>
                            <p className="text-lg text-gray-900 max-w-md">
                                This is your guide to get started with the virtual festival experience.
                                Follow the steps to customize your experience.
                            </p>
                        </div>
                        <button
                            onClick={() => setCurrentState("preview")}
                            className="px-8 py-3 bg-violet-500 text-white rounded-lg font-semibold hover:bg-violet-600 transition-colors"
                        >
                            Start
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
                        className="flex flex-col items-center space-y-6"
                    >
                        <h1 className="text-4xl font-bold">Preview</h1>
                        <div className="w-full max-w-2xl h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                            <p className="text-gray-500">Preview content will be displayed here</p>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setCurrentState("guide")}
                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setCurrentState("choose-style")}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Next
                            </button>
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
                        <h1 className="text-4xl font-bold">Choose Your Style</h1>
                        <div className="grid grid-cols-2 gap-4 max-w-lg">
                            {["Style 1", "Style 2", "Style 3", "Style 4"].map((style, index) => (
                                <motion.button
                                    key={style}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                    className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    {style}
                                </motion.button>
                            ))}
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setCurrentState("preview")}
                                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={() => setCurrentState("result")}
                                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Confirm
                            </button>
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
                        <h1 className="text-4xl font-bold">Result</h1>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="w-full max-w-2xl h-64 bg-green-100 rounded-lg flex items-center justify-center"
                        >
                            <p className="text-green-700 font-semibold">Your customized experience is ready!</p>
                        </motion.div>
                        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                            <button
                                onClick={() => setCurrentState("guide")}
                                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Start Over
                            </button>
                            <div className="flex space-x-4">
                                <button
                                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Share
                                </button>
                                <button
                                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                    Save Image
                                </button>
                            </div>
                        </div>
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
            <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
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