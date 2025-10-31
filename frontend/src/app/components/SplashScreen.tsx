'use client';
import Lottie from 'lottie-react';
import { useEffect, useState } from 'react';

import loadingAnimation from '../../../public/Comacon - planning.json';

export default function SplashScreen() {
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => setVisible(false), 500);
        }, 1000);

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 40);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className={`
                fixed top-0 left-0
                w-screen h-screen
                flex flex-col items-center justify-center
                bg-white
                z-[99999]
                overflow-hidden
                transition-all duration-500 ease-in-out
                ${isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            `}
        >
            <div className="w-1/3 ">
                <Lottie
                    animationData={loadingAnimation}
                    loop={true}
                    autoplay={true}
                    rendererSettings={{
                        preserveAspectRatio: 'xMidYMid slice'
                    }}
                />
            </div>

            <div className="text-center px-4 space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 animate-fade-in-down [animation-delay:0.2s]">
                    ยินดีต้อนรับ
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 font-semibold mb-6 animate-slide-up [animation-delay:0.4s]">
                    สู่ระบบ Project Management System
                </p>
                <p className="text-base md:text-lg text-gray-500 italic max-w-md mx-auto mb-6 animate-fade-in [animation-delay:0.6s]">
                    จัดการโครงการของคุณอย่างง่ายดาย – วางแผน ติดตาม และทำงานร่วมกันได้ทุกที่
                </p>


                <div className="w-full max-w-md mx-auto mb-4 animate-pulse-slow">
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden relative">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-in-out relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                        >

                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center animate-fade-in [animation-delay:0.8s]">
                        {progress}% โหลดแล้ว
                    </p>
                </div>
            </div>
        </div>
    );
}