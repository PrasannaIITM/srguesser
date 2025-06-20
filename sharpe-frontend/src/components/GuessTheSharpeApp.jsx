// GuessTheSharpeApp.jsx — CLEAN MASTER VERSION
// ---------------------------------------------------------------
// Features
// • Line-chart PnL for 2 years (504 points).
// • 3 lives (❤). Lose a life only when |error| > 0.30.
// • Coins: +5 (exact 2-dp), +3 (exact 1-dp), +1 (|err| ≤ 0.30 but not exact).
// • Game ends when lives hit zero → “Start New Game” resets.
// • Sample Sharpe always constrained to [-3, 3].
// ---------------------------------------------------------------
// External dep: npm i recharts

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

// ──────────────────────────────────
// Constants
// ──────────────────────────────────
const DAYS = 252 * 2; // 504 trading sessions
const TRUE_SR_RANGE = [-3, 3];
const SIGMA_RANGE = [0.005, 0.03]; // 0.5–3 % daily vol

// ──────────────────────────────────
// Math helpers
// ──────────────────────────────────
const randn = () => {
    const u = 1 - Math.random();
    const v = 1 - Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function sampleSharpe(returns) {
    const mean = returns.reduce((a, r) => a + r, 0) / returns.length;
    const var_ =
        returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
    return (mean / Math.sqrt(var_)) * Math.sqrt(252);
}

function generateRound() {
    // Loop until sample Sharpe ∈ [-3, 3]
    while (true) {
        const trueSr =
            TRUE_SR_RANGE[0] + Math.random() * (TRUE_SR_RANGE[1] - TRUE_SR_RANGE[0]);
        const sigma = SIGMA_RANGE[0] + Math.random() * (SIGMA_RANGE[1] - SIGMA_RANGE[0]);
        const mu = (trueSr * sigma) / Math.sqrt(252);

        const returns = Array.from({ length: DAYS }, () => mu + sigma * randn());
        const sSharpe = sampleSharpe(returns);
        if (sSharpe < -3 || sSharpe > 3) continue; // regenerate

        let cum = 0;
        const data = returns.map((r, i) => ({ day: i + 1, pnl: (cum += r) }));
        return { data, sharpe: sSharpe };
    }
}

// ──────────────────────────────────
// Scoring helpers
// ──────────────────────────────────
function coinsFor(err, guess, target) {
    if (Math.round(guess * 100) === Math.round(target * 100)) return 5;
    if (Math.round(guess * 10) === Math.round(target * 10)) return 3;
    if (err <= 0.3) return 1;
    return 0;
}

const Heart = ({ full }) => (
    <span className={`text-2xl ${full ? "text-red-500" : "text-gray-600"}`}>❤</span>
);

// ──────────────────────────────────
// Component
// ──────────────────────────────────
export default function GuessTheSharpeApp() {
    const [round, setRound] = useState(generateRound());
    const [guess, setGuess] = useState("");
    const [lives, setLives] = useState(3);
    const [coins, setCoins] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [gameOver, setGameOver] = useState(false);

    const resetGame = () => {
        setLives(3);
        setCoins(0);
        setFeedback(null);
        setGuess("");
        setRound(generateRound());
        setGameOver(false);
    };

    const handleSubmit = () => {
        const g = parseFloat(guess);
        if (!Number.isFinite(g)) return;

        const err = Math.abs(g - round.sharpe);
        const pts = coinsFor(err, g, round.sharpe);
        const lostLife = err > 0.3;

        if (pts > 0) setCoins((c) => c + pts);
        if (lostLife) setLives((l) => l - 1);

        setFeedback({ guess: g, target: round.sharpe, err, pts, lostLife });

        const remaining = lostLife ? lives - 1 : lives;

        setTimeout(() => {
            if (remaining <= 0) {
                setGameOver(true);
            } else {
                setRound(generateRound());
                setGuess("");
                setFeedback(null);
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen flex flex-col items-center gap-6 p-6 bg-gray-950 text-gray-100">
            {/* HUD */}
            <div className="flex items-center gap-3 text-lg">
                {[0, 1, 2].map((i) => (
                    <Heart key={i} full={i < lives} />
                ))}
                <span className="text-gray-300">x {lives}</span>
                <div className="flex items-center gap-1 text-yellow-400 text-xl font-bold ml-4">
                    🪙 <span>{coins}</span>
                </div>
            </div>

            <h1 className="text-3xl font-bold">Guess the Sharpe</h1>

            {/* Chart */}
            <Card className="w-full max-w-5xl bg-gray-900 shadow-xl">
                <CardContent className="p-4">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={round.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis
                                dataKey="day"
                                type="number"
                                domain={[1, DAYS]}
                                ticks={[126, 378]}
                                tickFormatter={(d) => (d < 252 ? "Year 1" : "Year 2")}
                                tick={{ fontSize: 11, fill: "#ccc" }}
                                axisLine={{ stroke: "#555" }}
                                tickLine={false}
                            />
                            <YAxis tick={{ fontSize: 10, fill: "#999" }} domain={["auto", "auto"]} />
                            <Tooltip
                                formatter={(v) => v.toFixed(4)}
                                labelFormatter={(l) => `Day ${l}`}
                                contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151" }}
                            />
                            <Line type="monotone" dataKey="pnl" stroke="#84cc16" dot={false} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Guess area or Game-over */}
            {!gameOver ? (
                <div className="flex flex-col items-center gap-4 w-full max-w-md mt-4">
                    <div className="flex gap-2 w-full">
                        <Input
                            placeholder="Your Sharpe ratio guess…"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-500 rounded-md px-3 py-2 focus:outline-none"
                        />
                        <Button onClick={handleSubmit}>Submit</Button>
                    </div>
                    {feedback && (
                        <p className="text-center mt-2">
                            <strong>Sharpe:</strong> {feedback.target.toFixed(2)} |{' '}
                            <strong>Your guess:</strong> {feedback.guess.toFixed(2)} |{' '}
                            <strong>Error:</strong> {feedback.err.toFixed(2)} |{' '}
                            {feedback.lostLife ? (
                                <strong className="text-red-400">Life lost!</strong>
                            ) : feedback.pts ? (
                                <strong>+{feedback.pts} 🪙</strong>
                            ) : (
                                <strong>No coins</strong>
                            )}
                        </p>
                    )}
                </div>
            ) : (
                <div className="mt-6 text-center">
                    <h2 className="text-2xl mb-4">Game Over</h2>
                    <Button onClick={resetGame}>Start New Game</Button>
                </div>
            )}
        </div>
    );
}