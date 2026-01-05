
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, GameMode, DifficultyLevel, Question, GameStats, QuestionResult, SessionRecord } from './types';
import { generateQuestion } from './services/mathGenerator';
import FeedbackBubble from './components/FeedbackBubble';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TIMED);
  const [level, setLevel] = useState<DifficultyLevel>(DifficultyLevel.BASIC);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    streak: 0,
    totalAnswered: 0,
    correctAnswers: 0,
    results: []
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [timer, setTimer] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [helpUsedThisQuestion, setHelpUsedThisQuestion] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('math_adventures_sessions');
    if (saved) setSessions(JSON.parse(saved));
  }, []);

  const startNewGame = (mode: GameMode, selectedLevel: DifficultyLevel) => {
    setStats({ score: 0, streak: 0, totalAnswered: 0, correctAnswers: 0, results: [] });
    setGameMode(mode);
    setLevel(selectedLevel);
    setGameState(GameState.PLAYING);
    setTimer(60);
    setFeedback(null);
    setIsPaused(false);
    setHelpUsedThisQuestion(false);
    const q = generateQuestion(selectedLevel);
    setCurrentQuestion({ ...q, startTime: Date.now() });
  };

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.PLAYING && gameMode === GameMode.TIMED && timer > 0 && !isPaused) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    } else if (timer === 0 && gameMode === GameMode.TIMED && gameState === GameState.PLAYING) {
      finishGame();
    }
    return () => clearInterval(interval);
  }, [gameState, timer, isPaused, gameMode]);

  const handleAnswer = (choice: number) => {
    if (!currentQuestion || feedback) return;

    const timeTaken = Date.now() - (currentQuestion.startTime || Date.now());
    const isCorrect = choice === currentQuestion.answer;

    const result: QuestionResult = {
      ...currentQuestion,
      selectedAnswer: choice,
      isCorrect,
      timeTaken,
      usedHelp: helpUsedThisQuestion
    };

    setStats(prev => ({
      ...prev,
      totalAnswered: prev.totalAnswered + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      streak: isCorrect ? prev.streak + 1 : 0,
      score: isCorrect ? prev.score + (10 * (prev.streak + 1)) : prev.score,
      results: [...prev.results, result]
    }));

    if (isCorrect) {
      setFeedback({ type: 'success', message: "כל הכבוד! פתרת את החידה!" });
      setTimeout(() => {
        setFeedback(null);
        setHelpUsedThisQuestion(false);
        const q = generateQuestion(level);
        setCurrentQuestion({ ...q, startTime: Date.now() });
      }, 1000);
    } else {
      setIsPaused(true);
      setFeedback({ 
        type: 'error', 
        message: `לא נורא! התשובה הנכונה היא ${currentQuestion.answer}.`
      });
    }
  };

  const nextQuestionAfterError = () => {
    setFeedback(null);
    setIsPaused(false);
    setHelpUsedThisQuestion(false);
    const q = generateQuestion(level);
    setCurrentQuestion({ ...q, startTime: Date.now() });
  };

  const finishGame = () => {
    const session: SessionRecord = {
      date: new Date().toLocaleString('he-IL'),
      mode: gameMode,
      level: level,
      score: stats.score,
      accuracy: Math.round((stats.correctAnswers / (stats.totalAnswered || 1)) * 100),
      avgTime: Math.round(stats.results.reduce((acc, r) => acc + r.timeTaken, 0) / (stats.results.length || 1) / 100) / 10,
      totalHelpUsed: stats.results.filter(r => r.usedHelp).length,
      mistakes: stats.results.filter(r => !r.isCorrect).map(r => `${r.num1} ${r.operation} ${r.num2} = ${r.result}`),
      toughestQuestions: [...stats.results].sort((a, b) => b.timeTaken - a.timeTaken).slice(0, 3).map(r => `${r.num1} ${r.operation} ${r.num2} = ${r.result}`)
    };

    const updatedSessions = [session, ...sessions].slice(0, 50);
    setSessions(updatedSessions);
    localStorage.setItem('math_adventures_sessions', JSON.stringify(updatedSessions));
    setGameState(GameState.SUMMARY);
  };

  const analyticsSummary = useMemo(() => {
    if (sessions.length === 0) return null;
    const allMistakes = sessions.flatMap(s => s.mistakes);
    const mistakeCounts: Record<string, number> = {};
    allMistakes.forEach(m => mistakeCounts[m] = (mistakeCounts[m] || 0) + 1);
    
    return {
      avgAccuracy: Math.round(sessions.reduce((acc, s) => acc + s.accuracy, 0) / sessions.length),
      totalHelp: sessions.reduce((acc, s) => acc + s.totalHelpUsed, 0),
      difficultItems: Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
      levelSplit: {
        basic: sessions.filter(s => s.level === DifficultyLevel.BASIC).length,
        advanced: sessions.filter(s => s.level === DifficultyLevel.ADVANCED).length
      }
    };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200 p-4 md:p-8 flex flex-col items-center justify-center font-sans text-gray-800" dir="rtl">
      <div className={`${(showHelper || gameState === GameState.ANALYTICS) ? 'max-w-6xl' : 'max-w-xl'} w-full bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-4 border-indigo-200 relative overflow-hidden transition-all duration-500`}>
        
        {gameState !== GameState.ANALYTICS && (
          <div className="flex justify-between items-center mb-8">
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-md">ניקוד: {stats.score}</div>
            {gameMode === GameMode.TIMED && gameState === GameState.PLAYING && (
              <div className={`text-2xl font-black ${timer < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`}>{timer} ⏱️</div>
            )}
            <div className="bg-orange-400 text-white px-4 py-2 rounded-full font-bold shadow-md">רצף: {stats.streak} 🔥</div>
          </div>
        )}

        {gameState === GameState.START && (
          <div className="text-center space-y-8 animate-fade-in max-w-xl mx-auto">
            <h1 className="text-4xl font-black text-indigo-700 mb-2 italic">הרפתקת המתמטיקה! 🚀</h1>
            <p className="text-lg text-gray-500">בחרו את הרמה שלכם להיום:</p>
            
            <div className="space-y-4">
              <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100">
                <h3 className="font-bold text-indigo-700 mb-4 text-xl">רמה 1: בסיס 🌟</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => startNewGame(GameMode.TIMED, DifficultyLevel.BASIC)} className="bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md">אתגר זמן ⏱️</button>
                  <button onClick={() => startNewGame(GameMode.RELAXED, DifficultyLevel.BASIC)} className="bg-white text-indigo-600 border-2 border-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-all shadow-md">אימון חופשי 🧘</button>
                </div>
              </div>

              <div className="bg-purple-50 p-6 rounded-3xl border-2 border-purple-100">
                <h3 className="font-bold text-purple-700 mb-4 text-xl">רמה 2: מתקדם (נעלמים) 🧠</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={() => startNewGame(GameMode.TIMED, DifficultyLevel.ADVANCED)} className="bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 transition-all shadow-md">אתגר זמן ⏱️</button>
                  <button onClick={() => startNewGame(GameMode.RELAXED, DifficultyLevel.ADVANCED)} className="bg-white text-purple-600 border-2 border-purple-600 font-bold py-3 rounded-xl hover:bg-purple-50 transition-all shadow-md">אימון חופשי 🧘</button>
                </div>
              </div>
            </div>

            <button onClick={() => setGameState(GameState.ANALYTICS)} className="text-indigo-400 text-sm flex items-center justify-center gap-2 mx-auto mt-4 opacity-70 hover:opacity-100">
              ⚙️ לוח בקרה להורים (סטטיסטיקה)
            </button>
          </div>
        )}

        {gameState === GameState.PLAYING && currentQuestion && (
          <div className={`grid grid-cols-1 ${showHelper ? 'lg:grid-cols-2' : ''} gap-8 items-start`}>
            {showHelper && (
              <div className="bg-yellow-50 border-4 border-yellow-200 rounded-3xl p-6 shadow-inner animate-fade-in order-2 lg:order-1">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-black text-yellow-800">לוח הכפל 💡</p>
                  <button onClick={() => setShowHelper(false)} className="text-gray-400 hover:text-red-500">✖️</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="mx-auto text-xs border-collapse" dir="ltr">
                    <thead><tr><th className="p-1 border bg-gray-100">x</th>{[...Array(10)].map((_, i) => <th key={i} className="p-1 border bg-indigo-50 font-bold text-indigo-700">{i+1}</th>)}</tr></thead>
                    <tbody>{[...Array(10)].map((_, i) => (
                      <tr key={i}><th className="p-1 border bg-indigo-50 font-bold text-indigo-700">{i+1}</th>{[...Array(10)].map((_, j) => <td key={j} className="p-1 border text-center text-gray-600">{(i+1)*(j+1)}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            <div className={`space-y-8 order-1 lg:order-2 ${!showHelper ? 'max-w-xl mx-auto w-full' : ''}`}>
              {!showHelper && (
                <button onClick={() => { setShowHelper(true); setHelpUsedThisQuestion(true); }} className="bg-yellow-400 text-yellow-900 font-black px-6 py-2 rounded-xl flex items-center gap-2 mx-auto shadow-lg">פתח עזרה 💡</button>
              )}
              
              <div className="bg-indigo-50 rounded-3xl p-8 border-b-8 border-indigo-100 flex justify-center items-center shadow-inner gap-4 text-5xl md:text-7xl font-black text-indigo-900" dir="ltr">
                <span className={currentQuestion.missingPart === 'num1' ? 'text-pink-500 bg-pink-100 px-4 py-2 rounded-2xl animate-pulse border-2 border-pink-300' : ''}>
                  {currentQuestion.num1}
                </span>
                <span className="text-indigo-300">{currentQuestion.operation}</span>
                <span className={currentQuestion.missingPart === 'num2' ? 'text-pink-500 bg-pink-100 px-4 py-2 rounded-2xl animate-pulse border-2 border-pink-300' : ''}>
                  {currentQuestion.num2}
                </span>
                <span className="text-indigo-300">=</span>
                <span className={currentQuestion.missingPart === 'result' ? 'text-pink-500 bg-pink-100 px-4 py-2 rounded-2xl animate-pulse border-2 border-pink-300' : ''}>
                  {currentQuestion.result}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4" dir="ltr">
                {currentQuestion.options.map((opt, idx) => (
                  <button key={idx} onClick={() => handleAnswer(opt)} disabled={!!feedback} className={`py-6 rounded-2xl text-3xl font-bold transition-all border-b-4 ${feedback && opt === currentQuestion.answer ? 'bg-green-500 text-white border-green-700' : feedback ? 'bg-gray-100 text-gray-300 border-gray-200' : 'bg-white text-indigo-700 border-indigo-200 shadow-lg hover:scale-105 active:scale-95'}`}>{opt}</button>
                ))}
              </div>

              {feedback && (
                <div className="animate-fade-in">
                  <FeedbackBubble type={feedback.type} message={feedback.message} />
                  {feedback.type === 'error' && (
                    <button onClick={nextQuestionAfterError} className="mt-6 w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-xl hover:scale-105 transition-all">הבנתי, נמשיך! 🚀</button>
                  )}
                </div>
              )}
              {gameMode === GameMode.RELAXED && !feedback && (
                <button onClick={finishGame} className="text-gray-400 text-sm block mx-auto underline mt-4 hover:text-indigo-500 transition-colors">סיום אימון ושמירה</button>
              )}
            </div>
          </div>
        )}

        {gameState === GameState.SUMMARY && (
          <div className="text-center space-y-6 max-w-xl mx-auto">
            <h2 className="text-4xl font-black text-indigo-700">כל הכבוד! 🏆</h2>
            <p className="text-xl text-gray-500">סיימת סשן ברמת {level === DifficultyLevel.BASIC ? 'בסיס' : 'מתקדם'}</p>
            <div className="bg-indigo-50 p-6 rounded-3xl grid grid-cols-3 gap-4">
              <div><p className="text-gray-500 text-xs">דיוק</p><p className="text-2xl font-black text-indigo-600">{Math.round((stats.correctAnswers / (stats.totalAnswered || 1)) * 100)}%</p></div>
              <div><p className="text-gray-500 text-xs">עזרה</p><p className="text-2xl font-black text-orange-500">{stats.results.filter(r => r.usedHelp).length}</p></div>
              <div><p className="text-gray-500 text-xs">נקודות</p><p className="text-2xl font-black text-green-600">{stats.score}</p></div>
            </div>
            <button onClick={() => setGameState(GameState.START)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">חזרה לתפריט הראשי 🔁</button>
          </div>
        )}

        {gameState === GameState.ANALYTICS && (
          <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-indigo-800">לוח בקרה להורים 📊</h2>
              <button onClick={() => setGameState(GameState.START)} className="bg-gray-100 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">סגור</button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-20 text-gray-400">התחילו לשחק כדי לראות סטטיסטיקה!</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border-2 border-indigo-50 p-6 rounded-3xl shadow-sm">
                    <h3 className="font-bold mb-4 text-gray-600 italic">מגמת דיוק לאורך זמן</h3>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sessions.slice(0, 15).reverse()}>
                          <XAxis dataKey="date" hide />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} name="דיוק %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-indigo-50 p-6 rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
                    <h3 className="font-bold mb-4 text-gray-600">היסטוריית סשנים מפורטת</h3>
                    <table className="w-full text-right text-sm">
                      <thead><tr className="border-b text-gray-400"><th>תאריך</th><th>רמה</th><th>דיוק</th><th>זמן (ש')</th></tr></thead>
                      <tbody>
                        {sessions.map((s, i) => (
                          <tr key={i} className="border-b last:border-0 h-10 hover:bg-gray-50 transition-colors">
                            <td className="text-xs">{s.date.split(',')[0]}</td>
                            <td><span className={`px-2 py-0.5 rounded-full text-[10px] ${s.level === DifficultyLevel.ADVANCED ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>{s.level === DifficultyLevel.ADVANCED ? 'מתקדם' : 'בסיס'}</span></td>
                            <td className="font-bold">{s.accuracy}%</td>
                            <td>{s.avgTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100">
                    <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">⚠️ תרגילים קשים במיוחד</h3>
                    <div className="space-y-2">
                      {analyticsSummary?.difficultItems.map(([m, count], i) => (
                        <div key={i} className="flex justify-between bg-white/60 p-2 rounded-lg text-sm" dir="ltr">
                          <span className="font-bold">{m.replace('?', '_')}</span>
                          <span className="text-orange-600 font-bold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl flex flex-col items-center">
                    <h3 className="font-bold text-indigo-200 mb-4">התפלגות אימונים</h3>
                    <div className="flex gap-4 items-end h-24">
                       <div className="flex flex-col items-center">
                         <div className="bg-indigo-500 w-8 rounded-t-lg" style={{ height: `${(analyticsSummary?.levelSplit.basic || 0) * 10}px`, maxHeight: '60px' }}></div>
                         <span className="text-[10px] mt-1">בסיס</span>
                       </div>
                       <div className="flex flex-col items-center">
                         <div className="bg-purple-500 w-8 rounded-t-lg" style={{ height: `${(analyticsSummary?.levelSplit.advanced || 0) * 10}px`, maxHeight: '60px' }}></div>
                         <span className="text-[10px] mt-1">מתקדם</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-purple-200 rounded-full opacity-20 pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-indigo-200 rounded-full opacity-20 pointer-events-none"></div>
      </div>
      
      <footer className="mt-8 text-indigo-400 text-sm">נוצר באהבה לילדים שאוהבים לחשוב ✨</footer>
    </div>
  );
};

export default App;
