import React, { useState, useRef, useEffect } from "react"; // <- Add useRef, useEffect
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Heart as HeartSvg, Diamond } from "lucide-react";
import clsx from "clsx";

// ──────────────────────────────────
// Core helpers (unchanged)
// ──────────────────────────────────
const DAYS = 252 * 2;
const TRUE_SR_RANGE = [-3, 3];
const SIGMA_RANGE = [0.005, 0.03];

const randn = () => {
    const u = 1 - Math.random();
    const v = 1 - Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function sampleSharpe(a) {
    const m = a.reduce((s, x) => s + x, 0) / a.length;
    const v = a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
    return (m / Math.sqrt(v)) * Math.sqrt(252);
}

function genRound() {
    while (true) {
        const trueSr = TRUE_SR_RANGE[0] + Math.random() * (TRUE_SR_RANGE[1] - TRUE_SR_RANGE[0]);
        const sigma = SIGMA_RANGE[0] + Math.random() * (SIGMA_RANGE[1] - SIGMA_RANGE[0]);
        const mu = (trueSr * sigma) / Math.sqrt(252);
        const rets = Array.from({ length: DAYS }, () => mu + sigma * randn());
        const s = sampleSharpe(rets);
        if (s < -3 || s > 3) continue;
        let cum = 0;
        const data = rets.map((r, i) => ({ day: i + 1, pnl: (cum += r) }));
        return { data, sharpe: s };
    }
}

function coinReward(err, g, t) {
    if (g.toFixed(2) === t.toFixed(2)) return 5;      // exactly equal to 2 decimals
    if (err < 0.1) return 3;
    if (err < 0.3) return 1;
    return 0;
}

export default function GuessTheSharpeApp() {
    // const [maxCoins, setMaxCoins] = useState(() => {
    //     const stored = localStorage.getItem("maxSharpeCoins");
    //     return stored ? Number(stored) : 0;
    // });

    const [maxCoins, setMaxCoins] = useState(() => {
        const stored = localStorage.getItem("maxSharpeCoins");
        return stored ? Number(stored) : 0;
    });

    const [round, setRound] = useState(genRound());
    const [guess, setGuess] = useState("");
    const [lives, setLives] = useState(3);
    const [coins, setCoins] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [gameOver, setGameOver] = useState(false);

    const pixelFont = {
        fontFamily: '"Press Start 2P", monospace',
        letterSpacing: "-0.03em",
    };

    const inputRef = useRef(null);

    // Focus the input every new round/game
    useEffect(() => {
        if (!gameOver && inputRef.current) {
            inputRef.current.focus();
        }
    }, [round, gameOver]);

    // After gameOver is set to true, check and update maxCoins
    useEffect(() => {
        if (gameOver && coins > maxCoins) {
            setMaxCoins(coins);
            localStorage.setItem("maxSharpeCoins", coins.toString());
        }
        // eslint-disable-next-line
    }, [gameOver]);

    const handleNext = () => {
        // Only now check if out of lives
        if (lives <= 0) {
            setGameOver(true);
        } else {
            setRound(genRound());
            setGuess("");
            setFeedback(null);
        }
    };


    const resetGame = () => {
        setRound(genRound());
        setLives(3);
        setCoins(0);
        setGuess("");
        setFeedback(null);
        setGameOver(false);
    };

    const handleSubmit = () => {
        const g = parseFloat(guess);
        if (!Number.isFinite(g)) return;
        const err = Math.abs(g - round.sharpe);
        const pts = coinReward(err, g, round.sharpe);
        const lost = err > 0.3;
        if (pts) setCoins((c) => c + pts);
        if (lost) setLives((l) => l - 1);
        setFeedback({ guess: g, target: round.sharpe, err, pts, lost });

        // const remaining = lost ? lives - 1 : lives;
        // setTimeout(() => {
        //     if (remaining <= 0) {
        //         setGameOver(true);
        //     } else {
        //         setRound(genRound());
        //         setGuess("");
        //         setFeedback(null);
        //     }
        // }, 1200);

    };

    const remainingLives = feedback
        ? (feedback.lost ? lives - 1 : lives)
        : lives;

    // useEffect(() => {
    //     if (!gameOver) return;

    //     const handler = (e) => {
    //         if (e.key === "Enter") {
    //             resetGame();
    //         }
    //     };
    //     window.addEventListener("keydown", handler);
    //     return () => window.removeEventListener("keydown", handler);
    // }, [gameOver]);

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-50" style={pixelFont}>
            {/* subtle grid background */}
            {/* <Input
                ref={inputRef}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter") handleSubmit();
                }}
                className="h-12 w-72 bg-white border-4 border-black text-black text-lg px-4 text-center focus:outline-none"
                placeholder="?"
            /> */}

            <div
                className="absolute inset-0 opacity-5 rotate-6 pointer-events-none"
                style={{ backgroundImage: "repeating-linear-gradient(45deg,#0001 0 8px,transparent 8px 16px)" }}
            />

            {/* Shrink-wrap container for perfect centering */}
            <div className="relative z-10 flex flex-col items-center gap-10 p-6">
                <h1 className="text-4xl tracking-wider text-center">SHARPE GUESSER</h1>
                {/* <div className="text-xs font-mono text-red-600 mb-2">
                    [DEBUG] Real Sharpe: <b>{round.sharpe.toFixed(6)}</b>
                </div> */}
                {/* HUD */}
                <div className="flex items-center justify-center gap-x-8">
                    <div className="flex items-center space-x-2 min-w-[80px] justify-center">
                        {Array.from({ length: lives }).map((_, i) => (
                            <HeartSvg key={i} className="w-6 h-6 fill-red-500" />
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 min-w-[80px] justify-center">
                        <Diamond className="w-6 h-6 fill-yellow-500" />
                        <span>{coins}</span>
                    </div>
                    <div className="flex items-center space-x-2 min-w-[100px] justify-center">
                        <span className="font-bold text-slate-700">MAX</span>
                        <Diamond className="w-5 h-5 fill-yellow-500" />
                        <span className="text-lg">{maxCoins}</span>
                    </div>
                </div>

                {/* <div className="flex items-center justify-center space-x-10 flex-nowrap">
                    <div className="flex items-center space-x-2 mr-4">
                        {Array.from({ length: lives }).map((_, i) => (
                            <HeartSvg key={i} className="w-6 h-6 fill-red-500" />
                        ))}
                    </div>
                    <div className="flex items-center space-x-2">
                        <Diamond className="w-6 h-6 fill-yellow-500" />
                        <span>{coins}</span>
                    </div>
                </div> */}

                {/* Centered content */}
                <div className="flex flex-col md:flex-row gap-12 items-center justify-center">
                    <Card className="bg-white border-4 border-gray-900 shadow-lg">
                        <CardContent className="p-4">
                            <ResponsiveContainer width={480} height={340}>
                                <LineChart data={round.data} margin={{ top: 6, right: 16, left: 0, bottom: 6 }}>
                                    <CartesianGrid stroke="#d4d4d4" strokeDasharray="1 7" />
                                    <XAxis dataKey="day" hide />
                                    <YAxis hide domain={["auto", "auto"]} />
                                    <Line type="monotone" dataKey="pnl" stroke="#000" strokeWidth={1.5} dot={{ r: 1 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col items-center gap-6">
                        {!gameOver ? (
                            <>
                                <div className="flex gap-3 items-stretch">
                                    <Input
                                        ref={inputRef}
                                        value={guess}
                                        onChange={e => setGuess(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                if (!feedback) handleSubmit();
                                                else handleNext();
                                            }
                                        }}
                                        readOnly={!!feedback}  // not disabled!
                                        className="h-12 w-72 bg-white border-4 border-black text-black text-lg px-4 text-center focus:outline-none"
                                        placeholder="?"
                                    />

                                    <Button
                                        onClick={handleSubmit}
                                        className="h-12 border-4 border-black bg-blue-500 text-white text-lg px-4 hover:bg-blue-600 active:translate-y-px"
                                        disabled={!!feedback}
                                    >
                                        GUESS
                                    </Button>
                                </div>
                                {feedback && (
                                    <div className="flex flex-col items-center gap-2">
                                        <ul className="text-sm leading-7 text-center">
                                            <li>
                                                <span className="text-gray-500">ACTUAL SR</span> {feedback.target.toFixed(2)}
                                            </li>
                                            <li>
                                                <span className="text-gray-500">GUESSED SR</span> {feedback.guess.toFixed(2)}
                                            </li>
                                            <li>
                                                <span className="text-gray-500">DIFFERENCE</span> {feedback.err.toFixed(2)}
                                            </li>
                                            <li className="mt-2 font-bold">
                                                {feedback.lost ? (
                                                    <span className="text-red-500">Life lost!</span>
                                                ) : feedback.pts ? (
                                                    <span className="text-yellow-500">+{feedback.pts} coins</span>
                                                ) : null}
                                            </li>
                                        </ul>
                                        <Button
                                            className="h-10 mt-2 border-2 border-black bg-slate-800 text-white hover:bg-slate-900"
                                            onClick={handleNext}
                                        >
                                            NEXT
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="mb-4 text-2xl">GAME OVER</p>
                                <Button
                                    onClick={resetGame}
                                    className="h-12 border-4 border-black bg-green-600 px-6 py-3 text-white hover:bg-green-700"
                                >
                                    NEW GAME
                                </Button>
                                <Button
                                    onClick={() => {
                                        const tweet = encodeURIComponent(
                                            `I just scored a max Sharpe Guesser high score of ${maxCoins}! 📈🪙
Think you can beat me? Try it out!`
                                        );
                                        const url = "https://srguesser.vercel.app"; // Optional: add your app's URL
                                        window.open(
                                            `https://twitter.com/intent/tweet?text=${tweet}${url ? `%0A${encodeURIComponent(url)}` : ""}`,
                                            "_blank"
                                        );
                                    }}
                                    className="h-12 border-4 border-black bg-blue-400 px-6 py-3 text-white hover:bg-blue-600 mt-4"
                                >
                                    Share on Twitter
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
