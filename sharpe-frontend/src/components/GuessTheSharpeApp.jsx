// GuessTheSharpeApp.jsx — syntax‑clean centred version
// -----------------------------------------------------------------------------
// Only layout / styling touches; game logic unchanged.
// -----------------------------------------------------------------------------
import React, { useState } from "react";
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
import { Heart as HeartSvg, Coins } from "lucide-react";
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
    if (Math.round(g * 100) === Math.round(t * 100)) return 5;
    if (Math.round(g * 10) === Math.round(t * 10)) return 3;
    if (err <= 0.3) return 1;
    return 0;
}

const HeartIcon = ({ full }) => (
    <HeartSvg className={clsx("w-6 h-6", full ? "fill-red-500" : "fill-gray-400")} />
);

// ──────────────────────────────────
// Component
// ──────────────────────────────────
export default function GuessTheSharpeApp() {
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

        const remaining = lost ? lives - 1 : lives;
        setTimeout(() => {
            if (remaining <= 0) {
                setGameOver(true);
            } else {
                setRound(genRound());
                setGuess("");
                setFeedback(null);
            }
        }, 1200);
    };

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center items-center justify-center bg-slate-50" style={pixelFont}>
            {/* subtle grid background */}
            <div className="absolute inset-0 opacity-5 rotate-6 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(45deg,#0001 0 8px,transparent 8px 16px)" }} />

            <div className="relative z-10 flex flex-col items-center gap-10 p-6 w-full max-w-6xl mx-auto">
                {/* HUD */}
                <div className="flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                        {[0, 1, 2].map((i) => (
                            <HeartIcon key={i} full={i < lives} />
                        ))}
                        <span className="text-gray-700">x&nbsp;{lives}</span>
                    </div>
                    <div className="flex items-center gap-2 text-yellow-500">
                        <Coins className="w-6 h-6 fill-yellow-500" />
                        <span>{coins}</span>
                    </div>
                </div>

                <h1 className="text-4xl tracking-wider text-center">SHARPE&nbsp;GUESSER</h1>

                {/* Content grid */}
                <div className="grid md:grid-cols-2 gap-12 items-start">
                    {/* Chart */}
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

                    {/* Control panel */}
                    <div className="flex flex-col items-center gap-6">
                        {!gameOver ? (
                            <>
                                <div className="flex gap-3 items-center">
                                    <Input
                                        value={guess}
                                        onChange={(e) => setGuess(e.target.value)}
                                        className="w-72 bg-white border-4 border-black text-black text-lg px-2 py-1 text-center focus:outline-none"
                                        placeholder="?"
                                    />
                                    <Button onClick={handleSubmit} className="border-4 border-black bg-blue-500 text-white px-4 py-2 hover:bg-blue-600 active:translate-y-px">
                                        GUESS
                                    </Button>
                                </div>

                                {feedback && (
                                    <ul className="text-sm leading-7 text-center">
                                        <li><span className="text-gray-500">ACTUAL&nbsp;SR</span> {feedback.target.toFixed(2)}</li>
                                        <li><span className="text-gray-500">GUESSED&nbsp;SR</span> {feedback.guess.toFixed(2)}</li>
                                        <li><span className="text-gray-500">DIFFERENCE</span> {feedback.err.toFixed(2)}</li>
                                        <li className="mt-2 font-bold">
                                            {feedback.lost ? (
                                                <span className="text-red-500">Life lost!</span>
                                            ) : feedback.pts ? (
                                                <span className="text-yellow-500">+{feedback.pts} coins</span>
                                            ) : null}
                                        </li>
                                    </ul>
                                )}
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="mb-4 text-2xl">GAME OVER</p>
                                <Button onClick={resetGame} className="border-4 border-black bg-green-600 px-6 py-3 text-white hover:bg-green-700">NEW GAME</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
