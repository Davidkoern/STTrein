import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Type definities
interface Question { combo: string; displayCombo: string; description: string; }
interface PerQuestionStat { vraag: string; tijd: string; punten: number; }
interface LeaderboardEntry { name: string; score: number; }

// Vertaaltabel voor technische toetsnamen naar Nederlandse weergave
const keyTranslation: { [key: string]: string } = {
  'arrowright': 'pijl rechts',
  'arrowleft': 'pijl links',
  'end': 'end',
  'backspace': 'backspace',
  'enter': 'enter',
};

// Basisvragenlijst
const BASE_QUESTIONS: { combo: string; description: string }[] = [
  { combo: "shift+enter", description: "E-mail openen in nieuw venster" },
  { combo: "ctrl+1", description: "Naar mail gaan in Outlook (vanuit je agenda)" },
  { combo: "ctrl+arrowright", description: "Cursor een woord naar rechts verplaatsen" },
  { combo: "ctrl+y", description: "Laatste actie herhalen" },
  { combo: "ctrl+end", description: "Naar het einde van het document gaan" },
  { combo: "ctrl+arrowleft", description: "Cursor een woord naar links verplaatsen" },
  { combo: "ctrl+2", description: "Naar je agenda gaan in Outlook (vanuit je mailbox)" },
  { combo: "ctrl+c", description: "Kopiëren van geselecteerde tekst of items" },
  { combo: "ctrl+x", description: "Knippen van geselecteerde tekst of items" },
  { combo: "ctrl+z", description: "Laatste actie ongedaan maken" },
  { combo: "ctrl+a", description: "Alles selecteren binnen het huidige venster of document" },
  { combo: "ctrl+b", description: "Vetgedrukt maken" },
  { combo: "ctrl+u", description: "Onderstrepen" },
  { combo: "ctrl+i", description: "Cursief maken" },
  { combo: "ctrl+f", description: "Zoeken" },
  { combo: "ctrl+backspace", description: "Het woord links van de cursor verwijderen" },
  { combo: "ctrl+r", description: "Geselecteerd bericht beantwoorden in Outlook" }
];

// Genereer de definitieve vragenlijst met de Nederlandse weergave van de sneltoetsen
const QUESTIONS: Question[] = BASE_QUESTIONS.map(q => ({
  ...q,
  displayCombo: q.combo.split('+').map(part => keyTranslation[part] || part).join('+')
}));

// Generieke functie met correcte definitie
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

// Veilige initialisatie van Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL of key ontbreekt in het .env bestand.");
}
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default function SneltoetsTrein() {
  const questions = useMemo(() => shuffleArray(QUESTIONS), []);
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

  // States met expliciete types
  const [perQuestionStats, setPerQuestionStats] = useState<PerQuestionStat[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [ranking, setRanking] = useState<number | null>(null);
  const [verbetering, setVerbetering] = useState<number | null>(null);

  const startRef = useRef(Date.now());
  const loginTimeRef = useRef(0);
  const attemptsRef = useRef(0);
  const readyRef = useRef(true);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // HIER IS DE FOUT GECORRIGEERD
  const current = useMemo(() => {
    if (step >= 0 && step < questions.length) {
      return questions[step];
    }
    return null;
  }, [step, questions]);

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
      const handler = (e: KeyboardEvent) => {
        if (!e.key || !readyRef.current || processing || locked || !current) return;
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
          setGameMessage("Goed!");

          setTimeout(() => {
            setGameMessage("");
            setLocked(false);
            setProcessing(false);
            setStep((prev) => prev + 1);
            attemptsRef.current = 0;
            readyRef.current = true;
            startRef.current = Date.now();
          }, 1000);

        } else {
          attemptsRef.current += 1;
          if (attemptsRef.current >= 2) {
            setLocked(true);
            setProcessing(true);
            setGameMessage(`Fout, het antwoord is '${current.displayCombo}'. We gaan nu naar de volgende vraag.`);

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
              startRef.current = Date.now();
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
        if (error) {
          console.error("Fout bij ophalen leaderboard:", error);
          return;
        }
        if (data) {
          const sortedLeaderboard = (data as LeaderboardEntry[]).sort((a, b) => b.score - a.score);
          setLeaderboard(sortedLeaderboard);
        }
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
        const verbeteringValue = previous !== null ? points - previous : null;
        setVerbetering(verbeteringValue);

        await supabase.from('scores').insert({
          name: username,
          score: points,
          details: perQuestionStats,
        });

        const { data, error } = await supabase.rpc('get_best_scores');
        if (error) {
          console.error("Fout bij ophalen leaderboard na opslaan:", error);
          return;
        }
        if (data) {
          const sortedLeaderboard = (data as LeaderboardEntry[]).sort((a, b) => b.score - a.score);
          setLeaderboard(sortedLeaderboard);
          const index = sortedLeaderboard.findIndex((entry: LeaderboardEntry) => entry.name === username && entry.score === points);
          if (index !== -1) setRanking(index + 1);
        }
      };
      saveScore();
    }
  }, [step, username, points, perQuestionStats]);

  const handleLogin = useCallback(() => {
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
  }, [inputName, password]);

  const resetGame = useCallback(() => {
    setStep(-1);
    setPoints(0);
    setPerQuestionStats([]);
    setRanking(null);
    setVerbetering(null);
  }, []);

  if (!loggedIn) {
    return (
<div style={{ maxWidth: '400px', margin: '0 auto', padding: '1rem' }}>
  {loginMessage && <p style={{ color: 'red' }}>{loginMessage}</p>}
  <h1>SneltoetsTrein Login</h1>

  <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
    <label htmlFor="naam" style={{ display: 'block', marginBottom: '0.25rem' }}>Naam</label>
    <input
      id="naam"
      type="text"
      value={inputName}
      onChange={(e) => setInputName(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      aria-label="Vul je naam in"
      ref={nameInputRef}
      placeholder="Jouw naam"
      style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
    />
  </div>

  <div style={{ marginBottom: '1rem', textAlign: 'left', position: 'relative' }}>
    <label htmlFor="wachtwoord" style={{ display: 'block', marginBottom: '0.25rem' }}>Wachtwoord</label>
    <input
      id="wachtwoord"
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      aria-label="Vul wachtwoord in"
      placeholder="Wachtwoord"
      style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
    />
    <button
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
      type="button"
      style={{
        position: 'absolute',
        right: '8px',
        top: '32px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.2em'
      }}
      tabIndex={-1}
    >
      {showPassword ? "👁️" : "🙈"}
    </button>
  </div>

  <button onClick={handleLogin} style={{
    width: '100%',
    background: '#003082',
    color: '#fff',
    padding: '10px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1em',
    cursor: 'pointer'
  }}>
    Inloggen
  </button>
</div>

    );
  }

  if (step === -1) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
        <h1>Welkom bij de SneltoetsTrein 🚄</h1>
        <p>In dit spel oefen je handige sneltoetsen. Je krijgt steeds een opdracht en drukt dan de bijbehorende toetsencombinatie in. De trein rijdt een stukje verder bij elk goed antwoord. Hoe sneller je antwoordt, hoe meer punten je verdient!</p>
        <p>Toetscombinaties die je gaat oefenen:</p>
<table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0' }}>
  <thead>
    <tr>
      <th style={{ textAlign: 'left', width: '180px', padding: '6px 12px', borderBottom: '2px solid #ccc' }}>Sneltoets</th>
      <th style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '2px solid #ccc' }}>Beschrijving</th>
    </tr>
  </thead>
  <tbody>
    {QUESTIONS.map((q, i) => (
      <tr key={i}>
        <td style={{ textAlign: 'left', width: '180px', padding: '6px 12px', borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>{q.displayCombo}</td>
        <td style={{ textAlign: 'left', padding: '6px 12px', borderBottom: '1px solid #eee' }}>{q.description}</td>
      </tr>
    ))}
  </tbody>
</table>
        <button
          onClick={() => setStep(0)}
          className="mt-6 bg-[#003082] text-white px-4 py-2 rounded"
          aria-label="Start de oefening"
        >
          Start de oefening
        </button>
        <h2>🏆 Alle scores:</h2>
        <ul>
          {leaderboard.map((entry, index) => (
            <li key={index}>
              {index + 1}. {entry.name} – {entry.score} punten
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (step >= questions.length) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
        <h1>Gefeliciteerd!</h1>
        <p>Je hebt de SneltoetsTrein op tijd het station laten bereiken. 🚉</p>
        <p>Totale score: {points} van de maximale {QUESTIONS.length * 15}</p>
        <h2>Overzicht per vraag:</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Vraag</th>
              <th>Opdracht</th>
              <th>Resultaat</th>
            </tr>
          </thead>
          <tbody>
            {perQuestionStats.map((stat, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{stat.vraag}</td>
                <td>Tijd: {stat.tijd}s – Punten: {stat.punten}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>🏆 Top 5 Scores:</h2>
        <ul>
          {leaderboard.slice(0, 5).map((entry, index) => (
            <li key={index}>
              {index + 1}. {entry.name} – {entry.score} punten
            </li>
          ))}
        </ul>
        {ranking && (
          <p>Gefeliciteerd, je bent nummer {ranking} van Legal!</p>
        )}
        <button onClick={resetGame}>Speel opnieuw!</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <h1>🚂💨</h1>
      <h2>🚉 Station</h2>
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
      <p>SneltoetsTrein</p>
      <p>Vraag {step + 1} van {questions.length}</p>
      <p>Druk op de sneltoets voor: {current?.description}</p>
      {gameMessage && <p>{gameMessage}</p>}
      <button onClick={resetGame}>Speel opnieuw!</button>
    </div>
  );
}
