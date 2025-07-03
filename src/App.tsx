import { useState, useEffect, useMemo, useRef } from "react";
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Type definities
type Question = { combo: string, displayCombo: string, description: string };
type PerQuestionStat = { vraag: string, tijd: string, punten: number };
type LeaderboardEntry = { name: string, score: number };

// Vertaaltabel voor technische toetsnamen naar Nederlandse weergave
const keyTranslation: { [key: string]: string } = {
  'arrowright': 'pijl rechts',
  'arrowleft': 'pijl links',
  'end': 'end',
  'backspace': 'backspace',
  'enter': 'enter',
};

// Basisvragenlijst
const BASE_QUESTIONS: { combo: string, description: string }[] = [
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


function shuffleArray(array: T[]): T[] {
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
  const [perQuestionStats, setPerQuestionStats] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [ranking, setRanking] = useState(null);
  const [verbetering, setVerbetering] = useState(null);

  const startRef = useRef(Date.now());
  const loginTimeRef = useRef(0);
  const attemptsRef = useRef(0);
  const readyRef = useRef(true);
  const nameInputRef = useRef(null);

  const current = useMemo(() => {
    if (step >= 0 && step  {
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
    if (loggedIn && step >= 0 && step  {
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
        if (!error && data) {
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
        const verbetering = previous !== null ? points - previous : null;
        setVerbetering(verbetering);

        await supabase.from('scores').insert({
          name: username,
          score: points,
          details: perQuestionStats,
        });

        const { data, error } = await supabase.rpc('get_best_scores');
        if (!error && data) {
          const sortedLeaderboard = (data as LeaderboardEntry[]).sort((a, b) => b.score - a.score);
          setLeaderboard(sortedLeaderboard);
          const index = sortedLeaderboard.findIndex((entry: LeaderboardEntry) => entry.name === username);
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

  function resetGame() {
    setStep(-1);
    setPoints(0);
    setPerQuestionStats([]);
    setRanking(null);
    setVerbetering(null);
  }

  if (!loggedIn) {
    return (
      
        {loginMessage && {loginMessage}}
        SneltoetsTrein Login
         setInputName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          aria-label="Vul je naam in"
        />
        
           setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            aria-label="Vul wachtwoord in"
          />
           setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600"
            aria-label={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
          >
            {showPassword ? "👁️" : "🙈"}
          
        
        
          Inloggen
        
      
    );
  }

  if (step === -1) {
    return (
      
        Welkom bij de SneltoetsTrein 🚄
        In dit spel oefen je handige sneltoetsen. Je krijgt steeds een opdracht en drukt dan de bijbehorende toetsencombinatie in. De trein rijdt een stukje verder bij elk goed antwoord. Hoe sneller je antwoordt, hoe meer punten je verdient!
        Toetscombinaties die je gaat oefenen:
        
        
            
                
                    
                        Sneltoets
                        Beschrijving
                    
                
                
                    {QUESTIONS.map((q, i) => (
                        
                            {q.displayCombo}
                            {q.description}
                        
                    ))}
                
            
        

         setStep(0)}
          className="mt-6 bg-[#003082] text-white px-4 py-2 rounded"
          aria-label="Start de oefening"
        >
          Start de oefening
        

        
          🏆 Alle scores:
          
            {leaderboard.map((entry, index) => (
              
                {index + 1}. {entry.name} – {entry.score} punten
              
            ))}
          
        
      
    );
  }

  if (step >= questions.length) {
    return (
      
        Gefeliciteerd!
        Je hebt de SneltoetsTrein op tijd het station laten bereiken. 🚉
        
          Totale score: {points} van de maximale {QUESTIONS.length * 15}
        
        
          Overzicht per vraag:
           
                
                    
                        
                            Vraag
                            Opdracht
                            Resultaat
                        
                    
                    
                        {perQuestionStats.map((stat, index) => (
                            
                                {index + 1}
                                {stat.vraag}
                                Tijd: {stat.tijd}s – Punten: {stat.punten}
                            
                        ))}
                    
                
           
        
        
          🏆 Top 5 Scores:
          
            {leaderboard.slice(0, 5).map((entry, index) => (
              
                {index + 1}. {entry.name} – {entry.score} punten
              
            ))}
          
          {ranking && (
            
              Gefeliciteerd, je bent nummer {ranking} van Legal!
            
          )}
        
        
          Speel opnieuw!
        
      
    );
  }

  return (
    
      
        
          
        
        
          🚂💨
        
        🚉 Station
      
      {`
        @keyframes puff {
          0% { opacity: 0; transform: scale(0.5) translateY(10px); }
          50% { opacity: 1; transform: scale(1.2) translateY(-5px); }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
        .animate-puff {
          animation: puff 0.6s ease-out;
        }
      `}

      SneltoetsTrein
      Vraag {step + 1} van {questions.length}
      Druk op de sneltoets voor: {current?.description}
      {gameMessage && {gameMessage}}
      
      
        Speel opnieuw!
      
    
  );
}
```

[1] https://github.com/slidevjs/slidev/issues/1844
[2] https://github.com/evanw/esbuild/issues/3049
[3] https://stackoverflow.com/questions/79055670/vite-vue3-error-expected-but-found-setup-when-using-lang-ts
[4] https://github.com/vitejs/vite/issues/2659
[5] https://stackoverflow.com/questions/79296528/errors-while-starting-vite-react
[6] https://www.reddit.com/r/reactjs/comments/1hieo6s/error_while_creating_react_project/
[7] https://www.reddit.com/r/vuejs/comments/1brioqs/typescript_file_wont_compile_says_expected_but/
[8] https://stackoverflow.com/questions/60438275/react-typescript-error-parsing-error-expected/60438585
[9] https://laracasts.com/discuss/channels/inertia/vite-bilde-note-resolve-script-setup-langts
[10] https://github.com/evanw/esbuild/issues/3016
