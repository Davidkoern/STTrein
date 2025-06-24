import { useState, useEffect, useMemo, useRef } from "react";
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Type definitions
type Question = { combo: string, description: string };
type PerQuestionStat = { vraag: string, tijd: string, punten: number };
type LeaderboardEntry = { name: string, score: number };

const ORIGINAL_QUESTIONS: Question[] = [
  { combo: "shift+enter", description: "E-mail openen in nieuw venster" },
  { combo: "ctrl+1", description: "Naar mail gaan in Outlook (vanuit je agenda)" },
  { combo: "ctrl+arrowright", description: "Cursus woord naar rechts" },
  { combo: "ctrl+y", description: "Actie herhalen" },
  { combo: "ctrl+end", description: "Naar einde document" },
  { combo: "ctrl+arrowleft", description: "Met cursor woord naar links" },
  { combo: "ctrl+2", description: "Naar je agenda gaan in Outlook (vanuit je mailbox)" },
  { combo: "ctrl+c", description: "Kopiëren van geselecteerde tekst of items" },
  { combo: "ctrl+x", description: "Knippen van geselecteerde tekst of items" },
  { combo: "ctrl+z", description: "Ongedaan maken van de laatste actie" },
  { combo: "ctrl+a", description: "Alles selecteren binnen het huidige venster of document" },
  { combo: "ctrl+b", description: "Vetgedrukt maken" },
  { combo: "ctrl+u", description: "Onderstrepen" },
  { combo: "ctrl+i", description: "Cursief maken" },
  { combo: "ctrl+f", description: "Zoeken" },
  { combo: "ctrl+backspace", description: "Verwijderen van het woord links van de cursor" },
  { combo: "ctrl+r", description: "Geselecteerd bericht beantwoorden in Outlook" }
];

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

function normalizeCombo(event: KeyboardEvent): string {
  const keys = [];
  if (event.ctrlKey) keys.push("ctrl");
  if (event.altKey) keys.push("alt");
  if (event.metaKey) keys.push("meta");
  if (event.shiftKey) keys.push("shift");
  if (!["Control", "Alt", "Meta", "Shift"].includes(event.key)) {
    keys.push(event.key.toLowerCase());
  }
  return keys.join("+");
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default function SneltoetsTrein() {
  const questions = useMemo(() => shuffleArray(ORIGINAL_QUESTIONS), []);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(-1);
  const [points, setPoints] = useState(0);
  const [loginMessage, setLoginMessage] = useState("");
  const [gameMessage, setGameMessage] = useState("");
  const [locked, setLocked] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [perQuestionStats, setPerQuestionStats] = useState<PerQuestionStat[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ranking, setRanking] = useState<number | null>(null);
  const [verbetering, setVerbetering] = useState<number | null>(null);

  const startRef = useRef<number>(Date.now());
  const loginTimeRef = useRef(0);
  const attemptsRef = useRef(0);
  const readyRef = useRef(true);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const current = useMemo(() => {
    if (step >= 0 && step < questions.length) {
      return questions[step];
    }
    return null;
  }, [questions, step]);

  useEffect(() => {
    document.body.style.backgroundColor = '#FFC917';
    document.body.style.color = '#003082';
    document.body.style.textAlign = 'center';
    document.body.style.margin = '0 auto';
  }, []);

  useEffect(() => {
    if (!loggedIn && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn && step >= 0 && step < questions.length) {
      readyRef.current = true;
      attemptsRef.current = 0;
      setGameMessage("");
      startRef.current = Date.now();

      const handler = (e: KeyboardEvent) => {
        if (!readyRef.current || processing || locked || !current) return;
        if (["Control", "Alt", "Meta", "Shift"].includes(e.key)) return;
        e.preventDefault();
        readyRef.current = false;

        const combo = normalizeCombo(e);

        if (combo === current.combo) {
          setLocked(true);
          setProcessing(true);
          const now = Date.now();
          const elapsed = now - startRef.current;
          const score = Math.floor((15000 - elapsed) / 1000);
          const punten = Math.max(score, 0);

          setPoints((prev) => prev + punten);
          setPerQuestionStats((prev) => [...prev, {
            vraag: current.description,
            tijd: (elapsed / 1000).toFixed(1),
            punten
          }]);
          setGameMessage("Goed! 🚆");

          setTimeout(() => {
            setGameMessage("");
            setLocked(false);
            setProcessing(false);
            setStep((prev) => prev + 1);
            attemptsRef.current = 0;
            readyRef.current = true;
          }, 1000);

        } else {
          attemptsRef.current += 1;
          if (attemptsRef.current >= 2) {
            setLocked(true);
            setProcessing(true);
            setGameMessage(`Antwoord: ${current.combo}`);

            setTimeout(() => {
              setPerQuestionStats((prev) => [...prev, {
                vraag: current.description,
                tijd: ">15",
                punten: 0
              }]);
              setGameMessage("");
              setLocked(false);
              setProcessing(false);
              setStep((prev) => prev + 1);
              readyRef.current = true;
            }, 2000);
          } else {
            setGameMessage("Probeer het opnieuw.");
            setTimeout(() => {
              readyRef.current = true;
            }, 200);
          }
        }
      };

      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [current, loggedIn, step, processing, locked, questions.length]);

  useEffect(() => {
    if (loggedIn && step === -1) {
      const fetchLeaderboard = async () => {
        const { data, error } = await supabase.rpc('get_best_scores');
        if (!error && data) setLeaderboard(data as LeaderboardEntry[]);
      };
      fetchLeaderboard();
    }
  }, [loggedIn, step]);

  useEffect(() => {
    if (step >= questions.length && username) {
      const saveScore = async () => {
        const { data: previousScores } = await supabase
          .from('scores')
          .select('score')
          .eq('name', username)
          .order('score', { ascending: false })
          .limit(1);

        const previous = previousScores?.[0]?.score ?? null;
        const verbetering = previous !== null ? points - previous : null;
        setVerbetering(verbetering);

        await supabase.from('scores').insert({
          name: username,
          score: points,
          details: perQuestionStats,
        });

        const { data, error } = await supabase.rpc('get_best_scores');
        if (!error && data) {
          setLeaderboard(data as LeaderboardEntry[]);
          const index = data.findIndex((entry: LeaderboardEntry) => entry.name === username);
          if (index !== -1) setRanking(index + 1);
        }
      };
      saveScore();
    }
  }, [step, username, points, perQuestionStats]);

  function handleLogin() {
    if (!inputName.trim()) {
      setLoginMessage("Voer je naam in.");
      if (nameInputRef.current) nameInputRef.current.focus();
    } else if (password === 'Keek op de Week') {
      setUsername(inputName.trim());
      setLoggedIn(true);
      loginTimeRef.current = Date.now();
      readyRef.current = true;
      attemptsRef.current = 0;
      setGameMessage("");
    } else {
      setLoginMessage("Wachtwoord klopt niet.");
    }
  }

  if (!loggedIn) {
    return (
      <div className="p-4 max-w-sm mx-auto">
        {loginMessage && <p className="text-red-600 mb-2 font-semibold">{loginMessage}</p>}
        <h1 className="text-xl font-bold mb-4">SneltoetsTrein Login</h1>
        <input
          ref={nameInputRef}
          type="text"
          placeholder="Naam"
          className="w-full mb-2 border px-2 py-1"
          value={inputName}
          onChange={(e) => setInputName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          aria-label="Vul je naam in"
        />
        <div className="relative mb-2">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Wachtwoord"
            className="w-full border px-2 py-1 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            aria-label="Vul wachtwoord in"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600"
            aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
          >
            {showPassword ? "👁️" : "🙈"}
          </button>
        </div>
        <button
          className="bg-[#003082] text-white px-4 py-2 w-full"
          onClick={handleLogin}
          aria-label="Inloggen"
        >
          Inloggen
        </button>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="p-4 max-w-2xl mx-auto text-[#003082]">
        <h1 className="text-3xl font-bold mb-4 text-[#FFC917]">Welkom bij de SneltoetsTrein 🚄</h1>
        <p className="mb-4">In dit spel oefen je handige sneltoetsen. Je krijgt steeds een opdracht en drukt dan de bijbehorende toetsencombinatie in. De trein rijdt een stukje verder bij elk goed antwoord. Hoe sneller je antwoordt, hoe meer punten je verdient!</p>
        <h2 className="text-xl font-semibold mb-2 text-[#003082]">Toetscombinaties die je gaat oefenen:</h2>
        <ul>
          {ORIGINAL_QUESTIONS.map((q, i) => (
            <li key={i}><strong>{q.combo}</strong>: {q.description}</li>
          ))}
        </ul>
        <button
          onClick={() => setStep(0)}
          className="mt-6 bg-[#003082] text-white px-4 py-2 rounded"
          aria-label="Start de oefening"
        >
          Start de oefening
        </button>

        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-2 text-[#003082]">🏆 Alle scores:</h2>
          <ul>
            {leaderboard.map((entry, index) => (
              <li key={index} className="border-b py-1">
                {index + 1}. {entry.name} – {entry.score} punten
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (step >= questions.length) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold text-[#003082]">Gefeliciteerd!</h1>
        <p>Je hebt de SneltoetsTrein op tijd het station laten bereiken. 🚉</p>
        <p className="mb-4 text-[#FFC917] font-semibold">
          Totale score: {points} van de maximale {ORIGINAL_QUESTIONS.length * 15}
        </p>
        <div className="text-left max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-2 text-[#003082]">Overzicht per vraag:</h2>
          <ul>
            {perQuestionStats.map((stat, index) => (
              <li key={index} className="border-b py-1">
                <strong>Vraag {index + 1}:</strong> {stat.vraag}<br />
                Tijd: {stat.tijd} sec – Punten: {stat.punten}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-left max-w-xl mx-auto mt-6">
          <h2 className="text-xl font-semibold mb-2 text-[#003082]">🏆 Top 5 Scores:</h2>
          <ul>
            {leaderboard.slice(0,5).map((entry, index) => (
              <li key={index} className="border-b py-1">
                {index + 1}. {entry.name} – {entry.score} punten
              </li>
            ))}
          </ul>
          {ranking && (
            <p className="mt-4 text-lg font-semibold text-[#003082]">
              Gefeliciteerd, je bent nummer {ranking} van Legal!
            </p>
          )}
        </div>
        <button
          className="mt-8 bg-[#003082] text-white px-4 py-2 rounded"
          onClick={() => {
            setStep(-1);
            setPoints(0);
            setPerQuestionStats([]);
            setRanking(null);
            setVerbetering(null);
          }}
          aria-label="Speel opnieuw"
        >
          Speel opnieuw!
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto text-[#003082]">
      <div className="relative w-full h-32 bg-[#003082] mb-6 overflow-hidden rounded-xl">
        <div className="absolute bottom-2 left-0 right-0 h-2 bg-[#FFC917] bg-opacity-50">
          <div className="absolute top-0 left-0 h-2 bg-[#FFC917] transition-all duration-700" style={{ width: `${(step / questions.length) * 100}%` }} />
        </div>
        <div className="absolute bottom-4 left-0 transition-transform duration-700 flex items-end" style={{ transform: `translateX(${(step / questions.length) * 90}%)` }}>
          🚂<span className="ml-1 animate-puff text-xl">💨</span>
        </div>
        <div className="absolute bottom-0 right-0 mr-2 text-sm">🚉 Station</div>
      </div>
      <style>{`
        @keyframes puff {
          0% { opacity: 0; transform: scale(0.5) translateY(10px); }
          50% { opacity: 1; transform: scale(1.2) translateY(-5px); }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
        .animate-puff {
          animation: puff 0.6s ease-out;
        }
      `}</style>

      <h1 className="text-2xl font-bold mb-4 text-[#FFC917]">SneltoetsTrein</h1>
      <p className="mb-2 text-[#FFC917] font-semibold">Vraag {step + 1} van {questions.length}</p>
      <p className="mb-4">Druk op de sneltoets voor: <strong>{current.description}</strong></p>
      {gameMessage && <p className="mt-2 text-lg">{gameMessage}</p>}
    </div>
  );
}
