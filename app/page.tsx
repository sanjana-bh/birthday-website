'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

export default function Home() {
  const [isLoveLetterOpen, setIsLoveLetterOpen] = useState(false);
  const [isBirthdayLetterOpen, setIsBirthdayLetterOpen] = useState(false);

  const [showFlyingMessage, setShowFlyingMessage] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [currentSection, setCurrentSection] = useState('landing')
  const [currentSong, setCurrentSong] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playAll, setPlayAll] = useState(false)
  const [volume, setVolume] = useState(0)
  const [isPageFocused, setIsPageFocused] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Open Apology Letter
  const handleOpenApologyLetter = () => setIsLoveLetterOpen(true);
  const handleCloseApologyLetter = () => setIsLoveLetterOpen(false);

// Open Birthday Letter
  const handleOpenBirthdayLetter = () => setIsBirthdayLetterOpen(true);
  const handleCloseBirthdayLetter = () => setIsBirthdayLetterOpen(false);

  
  // Game states
  const [showGameModal, setShowGameModal] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [hearts, setHearts] = useState<Array<{id: number, x: number, y: number}>>([])
  const [helloKitty, setHelloKitty] = useState<{id: number, x: number, y: number, visible: boolean} | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  
  const songsRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<HTMLDivElement>(null)
  const apologyRef = useRef<HTMLDivElement>(null)
  const landingRef = useRef<HTMLDivElement>(null)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const loveRef = useRef<HTMLDivElement>(null)
  
  // Audio refs for all songs
  const audioRefs = useRef<HTMLAudioElement[]>([])
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Game refs
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const heartSpawnRef = useRef<NodeJS.Timeout | null>(null)
  const kittySpawnRef = useRef<NodeJS.Timeout | null>(null)

  // Song data with Vercel Blob Storage links
  const songs = [
    {
      id: 1,
      title: "Tere Sang Yaara",
      emoji: "✨",
      url: "https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/Tere%20sang%20yaara.mpeg",
      section: 'landing'
    },
    {
      id: 2,
      title: "Itni Si Baat Hai",
      emoji: "🤏",
      url: "https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/Itni%20si%20baat%20hai.mpeg",
      section: 'apology'
    },
    {
      id: 3,
      title: "Tum Mile",
      emoji: "🫂",
      url: "https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/Tum%20mile.mpeg",
      section: 'songs'
    },
    {
      id: 4,
      title: "I Love You",
      emoji: "❤️",
      url: "https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/I%20Love%20You.mpeg",
      section: 'game'
    }
  ]

  // Initialize audio elements
  useEffect(() => {
    songs.forEach((song, index) => {
      const audio = new Audio()
      audio.src = song.url
      audio.preload = 'auto'
      audio.volume = 0
      
      // Add event listeners for duration and time updates
      audio.addEventListener('loadedmetadata', () => {
        if (currentSong === song.id) {
          setDuration(audio.duration)
        }
      })
      
      audio.addEventListener('timeupdate', () => {
        if (currentSong === song.id && isPlaying) {
          setCurrentTime(audio.currentTime)
        }
      })
      
      audioRefs.current[index] = audio
    })

    return () => {
      // Cleanup audio elements
      audioRefs.current.forEach(audio => {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      cleanupGame()
    }
  }, [])

  // Update progress bar when song changes
  useEffect(() => {
    if (currentSong !== null && audioRefs.current[currentSong - 1]) {
      const audio = audioRefs.current[currentSong - 1]
      setDuration(audio.duration || 0)
      setCurrentTime(audio.currentTime || 0)
    }
  }, [currentSong])

  // Progress bar updater
  useEffect(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    if (isPlaying && currentSong !== null) {
      progressIntervalRef.current = setInterval(() => {
        const audio = audioRefs.current[currentSong - 1]
        if (audio) {
          setCurrentTime(audio.currentTime)
        }
      }, 100)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, currentSong])

  // Handle user interaction for mobile autoplay
  useEffect(() => {
    const handleFirstInteraction = () => {
      setHasUserInteracted(true)
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [])

  // Handle page visibility (tab switching) - REMOVED AUTO-PLAY ON FOCUS
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPageFocused(false)
        // Immediate mute and pause when tab loses focus
        audioRefs.current.forEach(audio => {
          if (audio) {
            audio.volume = 0
            audio.pause()
          }
        })
        setIsPlaying(false)
        setVolume(0)
      } else {
        setIsPageFocused(true)
        // DON'T resume playback when tab gains focus - only if user explicitly plays
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentSong, isPlaying, hasUserInteracted])

  // REMOVED Intersection Observer for section-based playback
  // Songs will only play when manually clicked

  // Smooth fade-in function
  const fadeInAudio = (audio: HTMLAudioElement) => {
    if (!isPageFocused) return
    
    audio.play().catch(error => {
      console.log('Audio play error:', error)
    })
    
    const startVolume = 0
    const targetVolume = 0.75
    const duration = 600
    const startTime = Date.now()
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
    }
    
    fadeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Cubic bezier easing: cubic-bezier(0.33, 1, 0.68, 1)
      const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2
      
      const newVolume = startVolume + (targetVolume - startVolume) * easeProgress
      audio.volume = newVolume
      setVolume(newVolume)
      
      if (progress >= 1) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current)
        }
      }
    }, 16)
  }

  // Smooth fade-out function
  const fadeOutAudio = (audio: HTMLAudioElement, onComplete?: () => void) => {
    const startVolume = audio.volume
    const duration = 500
    const startTime = Date.now()
    
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
    }
    
    fadeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Cubic bezier easing: cubic-bezier(0.25, 0.1, 0.25, 1)
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2
      
      const newVolume = startVolume * (1 - easeProgress)
      audio.volume = newVolume
      setVolume(newVolume)
      
      if (progress >= 1) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current)
        }
        onComplete?.()
      }
    }, 16)
  }

  // Manual song controls - ONLY way to play songs
  const playSong = (songId: number) => {
    setHasUserInteracted(true)
    
    if (currentSong === songId) {
      // Toggle play/pause for current song
      if (isPlaying) {
        const audio = audioRefs.current[songId - 1]
        if (audio) {
          fadeOutAudio(audio, () => {
            audio.pause()
            setIsPlaying(false)
          })
        }
      } else {
        setIsPlaying(true)
        const audio = audioRefs.current[songId - 1]
        if (audio) {
          fadeInAudio(audio)
        }
      }
    } else {
      // Switch to new song
      if (currentSong !== null && isPlaying) {
        const currentAudio = audioRefs.current[currentSong - 1]
        if (currentAudio) {
          fadeOutAudio(currentAudio, () => {
            currentAudio.pause()
            currentAudio.currentTime = 0
            playNewSong(songId)
          })
        }
      } else {
        playNewSong(songId)
      }
    }
  }

  const playNewSong = (songId: number) => {
    setCurrentSong(songId)
    setIsPlaying(true)
    setPlayAll(false)
    const audio = audioRefs.current[songId - 1]
    if (audio) {
      audio.currentTime = 0
      setCurrentTime(0)
      fadeInAudio(audio)
    }
  }

  const handleStopAll = () => {
    setHasUserInteracted(true)
    setPlayAll(false)
    if (currentSong !== null) {
      const audio = audioRefs.current[currentSong - 1]
      if (audio) {
        fadeOutAudio(audio, () => {
          audio.pause()
          audio.currentTime = 0
          setCurrentSong(null)
          setIsPlaying(false)
          setCurrentTime(0)
        })
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Handle song end for playlist
  useEffect(() => {
    const handleSongEnd = () => {
      setCurrentTime(0)
      if (playAll && currentSong !== null && currentSong < songs.length) {
        // Crossfade to next song
        const currentAudio = audioRefs.current[currentSong - 1]
        const nextSongId = currentSong + 1
        const nextAudio = audioRefs.current[nextSongId - 1]
        
        if (currentAudio && nextAudio) {
          fadeOutAudio(currentAudio, () => {
            currentAudio.pause()
            currentAudio.currentTime = 0
            setCurrentSong(nextSongId)
            setCurrentTime(0)
            nextAudio.currentTime = 0
            fadeInAudio(nextAudio)
          })
        }
      } else if (playAll && currentSong === songs.length) {
        // End of playlist
        const currentAudio = audioRefs.current[currentSong - 1]
        if (currentAudio) {
          fadeOutAudio(currentAudio, () => {
            currentAudio.pause()
            currentAudio.currentTime = 0
            setPlayAll(false)
            setCurrentSong(null)
            setIsPlaying(false)
            setCurrentTime(0)
          })
        }
      } else {
        setCurrentSong(null)
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }

    audioRefs.current.forEach(audio => {
      if (audio) {
        audio.addEventListener('ended', handleSongEnd)
      }
    })

    return () => {
      audioRefs.current.forEach(audio => {
        if (audio) {
          audio.removeEventListener('ended', handleSongEnd)
        }
      })
    }
  }, [currentSong, playAll, songs.length])

  // Game functions
  const startGame = () => {
    setHasUserInteracted(true)
    setShowGameModal(false)
    setGameStarted(true)
    setScore(0)
    setTimeLeft(30)
    setHearts([])
    setHelloKitty(null)
    
    // Start game loop
    gameLoopRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Spawn hearts
    heartSpawnRef.current = setInterval(spawnHeart, 800)
    
    // Spawn Hello Kitty occasionally
    kittySpawnRef.current = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every 4-6 seconds
        spawnHelloKitty()
      }
    }, 5000)
  }

  const spawnHeart = () => {
    if (!gameAreaRef.current) return
    
    const gameArea = gameAreaRef.current.getBoundingClientRect()
    const x = Math.random() * (gameArea.width - 40)
    
    setHearts(prev => [
      ...prev,
      { id: Date.now(), x, y: 0 }
    ])
  }

  const spawnHelloKitty = () => {
    if (!gameAreaRef.current) return
    
    const gameArea = gameAreaRef.current.getBoundingClientRect()
    const x = Math.random() * (gameArea.width - 60)
    
    setHelloKitty({
      id: Date.now(),
      x,
      y: 0,
      visible: true
    })
  }

  const catchHeart = (heartId: number) => {
    setScore(prev => {
      const newScore = prev + 1
      if (newScore >= 15) {
        completeGame()
      }
      return newScore
    })
    setHearts(prev => prev.filter(heart => heart.id !== heartId))
  }

  const catchHelloKitty = () => {
    setScore(prev => {
      const newScore = prev + 3
      if (newScore >= 15) {
        completeGame()
      }
      return newScore
    })
    setHelloKitty(null)
  }

  const completeGame = () => {
    cleanupGame()
    setTimeout(() => {
      setShowCompletionModal(true)
    }, 300)
  }

  const endGame = () => {
    cleanupGame()
    setGameStarted(false)
  }

  const cleanupGame = () => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    if (heartSpawnRef.current) clearInterval(heartSpawnRef.current)
    if (kittySpawnRef.current) clearInterval(kittySpawnRef.current)
    setGameStarted(false)
  }

  const closeCompletionModal = () => {
    setShowCompletionModal(false)
  }

  // Existing UI code
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFlyingMessage(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const scrollToSongs = () => {
    songsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToGame = () => {
    gameRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToApology = () => {
    apologyRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToLove = () => {
    loveRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  

  return (
    <div className="container" onClick={() => setHasUserInteracted(true)}>
      {/* Audio Volume Indicator (Bottom Right) */}
      <div className="audio-indicator">
        <div 
          className="pulsing-heart"
          style={{
            opacity: 0.3 + (volume * 0.7),
            animation: `pulse ${1 + (1 - volume)}s ease-in-out infinite`
          }}
        >
          ❤️
        </div>
        <div className="volume-bar">
          <div 
            className="volume-fill"
            style={{ width: `${volume * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Flying Message */}
      {showFlyingMessage && (
        <div className="flying-message">
          💌 A little surprise made just for you...
        </div>
      )}

      {/* Landing Section */}
      <section ref={landingRef} className="landing">
        {/* Floating Decorative Elements */}
        <div className="floating-elements">
          {/* Hearts */}
          <div className="heart heart-1">💖</div>
          <div className="heart heart-2">💖</div>
          <div className="heart heart-3">💖</div>
          <div className="heart heart-4">💖</div>
          
          {/* Envelopes */}
          <div className="envelope envelope-1">💌</div>
          <div className="envelope envelope-2">💌</div>
          <div className="envelope envelope-3">💌</div>
          
          {/* Sparkles */}
          <div className="sparkle sparkle-1">✨</div>
          <div className="sparkle sparkle-2">⭐</div>
          <div className="sparkle sparkle-3">✨</div>
          <div className="sparkle sparkle-4">⭐</div>
        </div>

        {/* Main Kitten Image */}
        <div className="kitten-container">
          <div className="kitten-image">
            <Image 
              src="/kitten.png"
              alt="Cute Kitten" 
              width={200}
              height={200}
              className="actual-kitten-img"
              priority
            />
          </div>
        </div>

        <h1 className="main-heading">Someone Special Deserves a Surprise 🎁</h1>
        
        {/* Envelope Button */}
        <button 
          className={`envelope-btn ${isOpening ? 'opening' : ''}`}
          onClick={() => setIsLoveLetterOpen(true)}
        >
          <span className="envelope-icon">💌</span>
          <span className="btn-text"> Open Your Love Letter 💞</span>
        </button>
      </section>

      {/* Apology Banner Section */}
      <section ref={apologyRef} className="apology-banner">
        <div className="apology-content">
          <h2 className="apology-heading">Hey my cutiepiee💫</h2>
          <p className="apology-subtext">I have something really sweet for you 🎂💖</p>
          <div className="apology-sparkle">✨</div>

          <div className="apology-card">
            <div className="card-heart card-heart-left">💖</div>
            <div className="card-heart card-heart-right">💖</div>
            
            <div className="mail-icon">
              💌
            </div>

            <button className="apology-cta" onClick={() => setIsBirthdayLetterOpen(true)}>
              Read Your Birthday Letter
              <span className="cta-icon">→</span>
            </button>
            
            <p className="cta-subtext">Click to open your surprise message 💕</p>
            
            <div className="bottom-sparkle">✨</div>
          </div>
        </div>
      </section>

      {/* Enhanced Songs Section */}
      <section ref={songsRef} className="songs-section">
        <div className="songs-card">
          <div className="music-icon">🎵</div>
          
          <h2 className="songs-title">Songs Dedicated To You</h2>
          <p className="songs-subtitle">Songs that remind me of you ✨</p>

          {/* Now Playing Display */}
          {currentSong && (
            <div className="now-playing-container">
              <div className="now-playing-text">
                🎶 Now Playing: {songs[currentSong - 1]?.title} {songs[currentSong - 1]?.emoji}
              </div>
              
              {/* Progress Bar */}
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="songs-list-container">
            <div className="songs-list">
              {songs.map((song) => (
                <div 
                  key={song.id}
                  className={`song-row ${currentSong === song.id ? 'playing' : ''}`}
                  onClick={() => playSong(song.id)}
                >
                  <div className="song-left">
                    <div className="song-dot"></div>
                    <span className="song-title">
                      {song.title} {song.emoji}
                    </span>
                  </div>
                  <div className="play-button">
                    {currentSong === song.id && isPlaying ? (
                      <div className="pause-icon">⏸</div>
                    ) : (
                      <div className="play-icon">▶</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="player-controls">
              <button 
                className={`play-all-btn ${playAll ? 'playing' : ''}`}
                onClick={() => {
                  setHasUserInteracted(true)
                  if (!playAll) {
                    setPlayAll(true)
                    setCurrentSong(1)
                    setIsPlaying(true)
                    const audio = audioRefs.current[0]
                    if (audio) {
                      audio.currentTime = 0
                      setCurrentTime(0)
                      fadeInAudio(audio)
                    }
                  } else {
                    setPlayAll(false)
                    if (currentSong !== null) {
                      const audio = audioRefs.current[currentSong - 1]
                      if (audio) {
                        fadeOutAudio(audio, () => {
                          audio.pause()
                          audio.currentTime = 0
                          setCurrentSong(null)
                          setIsPlaying(false)
                          setCurrentTime(0)
                        })
                      }
                    }
                  }
                }}
              >
                {playAll ? 'Playing All...' : 'Play All'}
              </button>
              
              <button 
                className="stop-btn"
                onClick={handleStopAll}
              >
                Stop
              </button>
            </div>
          </div>

          <div className="bottom-heart">💖</div>
        </div>
      </section>

      {/* Game Section */}
      <section ref={gameRef} className="game-section">
        <div className="game-card" onClick={() => setShowGameModal(true)}>
          <div className="game-heart-icon">💗</div>
          <h2 className="game-title">Play a Game!</h2>
          <p className="game-subtitle">Catch some hearts to unlock a special message</p>
        </div>

        {/* Game Modal */}
        {showGameModal && (
          <div className="game-modal-overlay" onClick={() => setShowGameModal(false)}>
            <div className="game-modal" onClick={(e) => e.stopPropagation()}>
              <button className="game-close-btn" onClick={() => setShowGameModal(false)}>×</button>
              <h2 className="game-modal-title">Catch Hearts & Hello Kitty!</h2>
              <p className="game-modal-text">
                Catch 15 hearts before time runs out! Look out for Hello Kitty for special bonuses!
              </p>
              <button className="game-start-btn" onClick={startGame}>
                Start Game
              </button>
            </div>
          </div>
        )}

        {/* Game Area */}
        {gameStarted && (
          <div className="game-area-overlay">
            <div className="game-area-container">
              <div className="game-stats">
                <div className="score-pill">
                  <span>Score: {score}</span>
                </div>
                <div className={`time-pill ${timeLeft <= 10 ? timeLeft <= 5 ? 'time-critical' : 'time-warning' : ''}`}>
                  <span>Time: {timeLeft}s</span>
                </div>
              </div>
              
              <div ref={gameAreaRef} className="game-play-area">
                {/* Falling Hearts */}
                {hearts.map(heart => (
                  <div
                    key={heart.id}
                    className="falling-heart"
                    style={{
                      left: `${heart.x}px`,
                      top: `${heart.y}px`
                    }}
                    onClick={() => catchHeart(heart.id)}
                  >
                    ❤️
                  </div>
                ))}
                
                {/* Hello Kitty */}
                {helloKitty && helloKitty.visible && (
                  <div
                    className="hello-kitty"
                    style={{
                      left: `${helloKitty.x}px`,
                      top: `${helloKitty.y}px`
                    }}
                    onClick={catchHelloKitty}
                  >
                    🐱
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Game Completion Modal */}
        {showCompletionModal && (
          <div className="completion-modal-overlay">
            <div className="completion-modal">
              <button className="completion-close-btn" onClick={closeCompletionModal}>×</button>
              <h2 className="completion-title">Game Complete!</h2>
              <div className="completion-icon">🏅</div>
              <p className="completion-message">You did it! You caught {score} hearts!</p>
              
              <div className="message-box">
                Thank you for playing! I hope this little game shows how much I care.
                My heart is yours to catch, always. I Love you soo muchh😘😘.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Love You Section */}
      <section ref={loveRef} className="love-you-section">
        <div className="love-container">
          <h2 className="love-section-title">Love You 💖</h2>
          <p className="love-section-subtitle">Every moment with you feels like magic ✨</p>
          
          <div className="love-cards-grid">
            {/* Card 1 */}
            <div className="love-card">
              <div className="speech-bubble">
                💭 “You’re my reason to smile every day. Happy Birthday, my love😘."
              </div>
              
              <div className="gif-container">
                <img 
                  src="https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/hello-kitty-i-love-you.gif"
                  alt="Hello Kitty sending love"
                  className="love-gif"
                />
              </div>
              
              <div className="love-caption">
                "You mean the world to me 💞"
              </div>
            </div>

            {/* Card 2 */}
            <div className="love-card">
              <div className="speech-bubble">
                💭 "I love you more than words can ever say 💞"
              </div>
              
              <div className="gif-container">
                <img 
                  src="https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/cuidados.gif"
                  alt="Cute romantic animation"
                  className="love-gif"
                />
              </div>
              
              <div className="love-caption">
                "My heart belongs to you forever ♾️"
              </div>
            </div>
          </div>
        </div>
      </section>
      			
      {/* Happy Birthday & Love You Letter Section */}
			<section className="birthday-letter-section">
				<div className="birthday-card">
					{/* Header with Gradient */}
					<div className="letter-header-gradient">
						<h2 className="letter-title">
							<span className="sparkle-left">✨</span>
							My Love Letter to You
							<span className="sparkle-right">✨</span>
						</h2>
					</div>

					{/* Letter Content */}
					<div className="letter-content-box">
						<div className="birthday-poem">
							<div className="birthday-letter">
                <p>💌 My Dearest patlu ji,</p>

                <p>Happy Birthday to the most cutest and lovely person in my life! Each day you brighten the world just by being you. 
                    You’ve got the cutest smile and You are the love of my life. There has never been anyone in my life as special
as you. I want to hold you and make you happy each and every day. I just want you to know that I love
you even more than the day we first met. I remember the way you made me feel.</p>
                <p>I’m so blessed to have you to share memories, dreams, love and all the little moments that mean so much. You’ve filled my life with happiness and love, and I’ll always be thankful for you.</p>
                <div className="poem-spacer"></div>
                <p>I hope today brings you all that you deserve love, peace, and endless joy. May every wish in your heart come true, and may you always feel how deeply you’re loved.</p>

                <p>You are my favorite person in the world, and I’m so proud to call you mine. 💖</p>
                <p>You're my forever, my sweetest gift💞</p>
                <p>I Love Youuuu🥺❤️</p>
                <p>Forever yours ~ Sanjana🎀</p>
              </div>
						</div>
					</div>

					{/* Bottom Decorations */}
					<div className="letter-bottom-decor">
						<span className="decor-heart">💖</span>
						<span className="decor-sparkle">✨</span>
						<span className="decor-heart">💜</span>
					</div>
				</div>
			</section>
      			{/* This Is Us Btw 💞 Section */}
			<section className="this-is-us-section">
				<div className="us-container">
					{/* Title Box */}
					<div className="us-title-box">
						💖💫 "This is us btw, always & forever"
					</div>

					{/* Divider Line with Hearts */}
					<div className="us-divider">
						<span className="divider-heart">💖</span>
						<span className="divider-sparkle">✨</span>
						<span className="divider-heart">💜</span>
					</div>

					{/* GIF Section */}
					<div className="us-gif-container">
						<img 
							src="https://idmyjkxlwqdbz3tt.public.blob.vercel-storage.com/bear-bear-love.gif"
							alt="Cute bear couple love animation"
							className="us-gif"
						/>
					</div>

					{/* Caption Text */}
					<div className="us-caption">
						"You make every moment brighter, just like today. 💫"
					</div>
				</div>
			</section>
      						{/* Final Message & Floating Hearts Outro */}
			<section className="final-outro-section">
				{/* Floating Hearts Background */}
				<div className="floating-hearts-container">
					{[
						{ left: 10, delay: 0, size: 18, opacity: 0.4, emoji: '💖' },
						{ left: 25, delay: 1, size: 22, opacity: 0.5, emoji: '💕' },
						{ left: 40, delay: 2, size: 16, opacity: 0.6, emoji: '💗' },
						{ left: 55, delay: 3, size: 20, opacity: 0.4, emoji: '💓' },
						{ left: 70, delay: 4, size: 19, opacity: 0.5, emoji: '💞' },
						{ left: 85, delay: 5, size: 17, opacity: 0.6, emoji: '💖' },
						{ left: 15, delay: 6, size: 21, opacity: 0.4, emoji: '💕' },
						{ left: 35, delay: 7, size: 18, opacity: 0.5, emoji: '💗' },
						{ left: 60, delay: 8, size: 23, opacity: 0.4, emoji: '💓' },
						{ left: 80, delay: 9, size: 16, opacity: 0.6, emoji: '💞' },
						{ left: 5, delay: 0.5, size: 20, opacity: 0.5, emoji: '💖' },
						{ left: 45, delay: 1.5, size: 17, opacity: 0.4, emoji: '💕' },
						{ left: 65, delay: 2.5, size: 22, opacity: 0.6, emoji: '💗' },
						{ left: 90, delay: 3.5, size: 19, opacity: 0.5, emoji: '💓' },
						{ left: 30, delay: 4.5, size: 18, opacity: 0.4, emoji: '💞' }
					].map((heart, i) => (
						<div 
							key={i}
							className="floating-heart"
							style={{
								left: `${heart.left}%`,
								animationDelay: `${heart.delay}s`,
								fontSize: `${heart.size}px`,
								opacity: heart.opacity
							}}
						>
							{heart.emoji}
						</div>
					))}
				</div>

				{/* Main Final Message */}
				<div className="final-message-container">
					<div className="final-message">
            <h2>HAPPIEST BIRTHDAY MY CUTIEPIE 🫂❤️✨</h2>
            <p>With love, <span className="signature">Sanjana 🎀✨</span></p>
					</div>
				</div>

				{/* Background Pulse Heart */}
				<div className="pulse-heart">💖</div>
			</section>


      {/* Letter Popup Overlay */}
      {isLoveLetterOpen && (
        <div className="popup-overlay" onClick={() => setIsLoveLetterOpen(false)}>
          <div className="letter-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsLoveLetterOpen(false)}>×</button>

            {/* Header - Dear Pinak */}
            <div className="letter-header">
              <div className="header-pill">
                <span className="pill-heart">💖</span>
                <span className="pill-text">Dear Rehan my Love 💌</span>
                <span className="pill-heart">💜</span>
              </div>
            </div>

            {/* Letter Content */}
            <div className="letter-content">
              {/* Left Margin Decoration */}
              <div className="margin-decoration">
                <div className="margin-line"></div>
                <div className="margin-dot"></div>
              </div>

              {/* Main Text */}
              <div className="message-text">
                <p>To my dearest one,</p>
                <p>I love you more every day.🥺 You are my safe place and my reason to be happy. Life feels better with you in it. 🌷✨</p>
                <p>No matter what, I’ll always choose you. 💌</p>
              </div>
            </div>

            {/* Divider Line */}
            <div className="letter-divider"></div>

            {/* Signature Section */}
            <div className="signature-section">
              <div className="love-text">With all my love,</div>
              <div className="signature">
                <div className="sincerely">Yours always,</div>
                <div className="name">Sanjana🎀</div>
              </div>
            </div>

            {/* Decorative Icons */}
            <div className="decorative-icons">
              <span className="deco-heart">💖</span>
              <span className="deco-sparkle">✨</span>
              <span className="deco-heart">💜</span>
            </div>
          </div>
        </div>

        
      
      )}
      			{isBirthdayLetterOpen && (
				<div className="popup-overlay" onClick={handleCloseBirthdayLetter}>
					<div className="letter-card" onClick={(e) => e.stopPropagation()}>
						<button className="close-btn" onClick={handleCloseBirthdayLetter}>×</button>

						<div className="letter-header">
							<div className="header-pill">
								<span className="pill-heart">🎂</span>
								<span className="pill-text">Happy Birthday, My Love</span>
								<span className="pill-heart">🎀</span>
							</div>
						</div>

						<div className="letter-content">
							<div className="margin-decoration">
								<div className="margin-line"></div>
								<div className="margin-dot"></div>
							</div>

							<div className="message-text">
								<p>Happy Birthday, my pyaaruu jii 😚😚</p>
								<p>You make my world brighter with every smile. I Love u sooo muchhh😘</p>
								<p>I hope today brings you as much happiness as you give me every day. 💖</p>
							</div>
						</div>

						<div className="letter-divider"></div>

						<div className="signature-section">
							<div className="love-text">Forever yours,</div>
							<div className="signature">
								<div className="sincerely">With soo muchh love,</div>
								<div className="name">Sanjana🎀</div>
							</div>
						</div>

						<div className="decorative-icons">
							<span className="deco-heart">🎂</span>
							<span className="deco-sparkle">✨</span>
							<span className="deco-heart">💖</span>
						</div>
					</div>
				</div>
			)}

      <style jsx>{`
        .container {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #ffe6f0 0%, #f0f8ff 100%);
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          cursor: pointer;
        }

        /* Audio Indicator Styles */
        .audio-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .pulsing-heart {
          font-size: 24px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .volume-bar {
          width: 60px;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          overflow: hidden;
        }

        .volume-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b9d, #c74ad4);
          border-radius: 2px;
          transition: width 0.2s ease;
        }

        /* Enhanced Songs Section Styles */
        .songs-section {
          background: linear-gradient(135deg, #e6f3ff 0%, #f0f8ff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .songs-card {
          background: linear-gradient(135deg, #ffffff, #f8f4ff);
          border-radius: 40px;
          padding: 60px 40px;
          max-width: 800px;
          width: 90%;
          box-shadow: 
            0 20px 40px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,0.8);
          position: relative;
          animation: songsCardIn 0.7s ease-out;
        }

        @keyframes songsCardIn {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .music-icon {
          background: white;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          margin: 0 auto 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          animation: musicBounce 2.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
        }

        @keyframes musicBounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        .songs-title {
          font-size: 2.5rem;
          color: #3b5bfe;
          font-weight: bold;
          margin-bottom: 10px;
          font-family: 'Poppins', sans-serif;
        }

        .songs-subtitle {
          color: #666;
          font-size: 1.2rem;
          margin-bottom: 40px;
          font-family: 'Quicksand', sans-serif;
        }

        /* Now Playing Styles */
        .now-playing-container {
          background: linear-gradient(135deg, #e3f2ff, #f0e8ff);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 30px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.08);
          border: 1px solid rgba(255,255,255,0.5);
        }

        .now-playing-text {
          font-size: 1.1rem;
          color: #4a5568;
          font-weight: 600;
          margin-bottom: 15px;
          text-align: center;
          font-family: 'Poppins', sans-serif;
        }

        .progress-container {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.8);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b9d, #c74ad4);
          border-radius: 3px;
          transition: width 0.1s linear;
          box-shadow: 0 0 8px rgba(199, 74, 212, 0.4);
        }

        .time-display {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #718096;
          font-family: 'Quicksand', sans-serif;
        }

        .songs-list-container {
          background: #eef5ff;
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.05);
        }

        .songs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .song-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 20px;
          background: white;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease-in-out;
          border: 2px solid transparent;
          font-family: 'Quicksand', sans-serif;
        }

        .song-row:hover {
          transform: translateX(4px);
          background: #f8fbff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .song-row.playing {
          background: linear-gradient(135deg, #dde9ff, #e8f4ff);
          border-color: #3b5bfe;
          box-shadow: 0 4px 15px rgba(59, 91, 254, 0.2);
        }

        .song-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .song-dot {
          width: 12px;
          height: 12px;
          background: #3b5bfe;
          border-radius: 50%;
          animation: dotPulse 2s ease-in-out infinite;
        }

        @keyframes dotPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        .song-title {
          color: #2d3748;
          font-size: 1.1rem;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
        }

        .play-button {
          width: 40px;
          height: 40px;
          background: #3b5bfe;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.9rem;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 2px 8px rgba(59, 91, 254, 0.3);
        }

        .song-row:hover .play-button {
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(59, 91, 254, 0.4);
        }

        .play-icon, .pause-icon {
          font-size: 0.8rem;
        }

        .player-controls {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 25px;
        }

        .play-all-btn {
          background: linear-gradient(135deg, #3b5bfe, #6a11cb);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(59, 91, 254, 0.3);
          font-family: 'Poppins', sans-serif;
        }

        .play-all-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 91, 254, 0.4);
        }

        .play-all-btn.playing {
          background: linear-gradient(135deg, #2d4fd8, #5a0fb5);
        }

        .stop-btn {
          background: linear-gradient(135deg, #ff6b9d, #c74ad4);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 107, 157, 0.3);
          font-family: 'Poppins', sans-serif;
        }

        .stop-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 157, 0.4);
        }

        .bottom-heart {
          font-size: 1.5rem;
          margin-top: 20px;
          animation: heartBeat 2s ease-in-out infinite;
        }

        @keyframes heartBeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        /* Love You Section Styles */
        .love-you-section {
          background: linear-gradient(180deg, #fff8ff 0%, #f9f4ff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          position: relative;
        }

        .love-container {
          max-width: 1200px;
          width: 100%;
          text-align: center;
        }

        .love-section-title {
          font-family: 'Patrick Hand', 'Comic Neue', cursive;
          font-size: 3rem;
          color: #ff6b9d;
          margin-bottom: 1rem;
          animation: titleGlow 2s ease-in-out infinite alternate;
        }

        @keyframes titleGlow {
          0% {
            text-shadow: 0 0 10px rgba(255, 107, 157, 0.4);
          }
          100% {
            text-shadow: 0 0 20px rgba(255, 107, 157, 0.8);
          }
        }

        .love-section-subtitle {
          font-family: 'Quicksand', sans-serif;
          font-size: 1.2rem;
          color: #666;
          margin-bottom: 3rem;
        }

        .love-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .love-card {
          background: white;
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          animation: cardEntry 0.9s ease-in-out;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
          overflow: hidden;
        }

        @keyframes cardEntry {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .love-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }

        .love-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff6b9d, #c74ad4);
          border-radius: 20px 20px 0 0;
        }

        /* Speech Bubble */
        .speech-bubble {
          background: #f6f4ff;
          border: 2px solid #c7c6ff;
          border-radius: 20px;
          padding: 1rem 1.2rem;
          font-family: 'Patrick Hand', 'Comic Neue', cursive;
          font-size: 1rem;
          color: #3e3e52;
          position: relative;
          animation: bubbleSlide 0.7s ease-out;
          box-shadow: inset 0 0 8px rgba(180,160,255,0.2);
          text-align: left;
          line-height: 1.4;
        }

        @keyframes bubbleSlide {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #c7c6ff;
        }

        .speech-bubble:hover {
          animation: bubblePulse 1.5s ease-in-out infinite;
        }

        @keyframes bubblePulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: inset 0 0 8px rgba(180,160,255,0.2);
          }
          50% {
            transform: scale(1.02);
            box-shadow: inset 0 0 12px rgba(180,160,255,0.4);
          }
        }

        /* GIF Container */
        .gif-container {
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          transition: all 0.4s ease-in-out;
          position: relative;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .love-gif {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 15px;
          transition: all 0.4s ease-in-out;
        }

        .gif-container:hover .love-gif {
          transform: scale(1.03);
          opacity: 0.95;
        }

        /* Love Caption */
        .love-caption {
          font-family: 'Quicksand', 'Nunito', sans-serif;
          font-size: 1rem;
          color: #423f52;
          text-align: center;
          padding: 0.5rem;
          animation: captionFade 0.6s ease 0.5s both;
          font-weight: 500;
        }

        @keyframes captionFade {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Interactive Elements */
        .love-card:hover .speech-bubble {
          border-color: #b6b3ff;
          background: #f8f7ff;
        }

        /* Floating hearts background decoration */
        .love-you-section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 80%, rgba(255, 182, 193, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(199, 74, 212, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(107, 91, 254, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: 0;
        }

        .love-container {
          position: relative;
          z-index: 1;
        }

        /* Rest of the existing styles remain the same... */
        .game-section {
          background: linear-gradient(135deg, #e6f3ff 0%, #f8e1f4 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .game-card {
          background: linear-gradient(135deg, #fff6fa, #ffeefc);
          border-radius: 1rem;
          padding: 50px 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 0.5px solid #f2c8f6;
          box-shadow: 0 4px 10px rgba(255, 0, 100, 0.2);
          max-width: 400px;
          width: 90%;
        }

        .game-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 12px rgba(255, 100, 180, 0.3);
        }

        .game-heart-icon {
          font-size: 3rem;
          margin-bottom: 20px;
          animation: heartPulse 1.5s ease-in-out infinite;
        }

        @keyframes heartPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }

        .game-title {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          color: #cc2e8b;
          font-size: 1.8rem;
          margin-bottom: 10px;
        }

        .game-subtitle {
          color: #6b6b6b;
          font-size: 1rem;
        }

        /* Game Modal */
        .game-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          animation: fadeIn 0.3s ease-out;
        }

        .game-modal {
          background: #fffdfd;
          border-radius: 12px;
          padding: 40px 30px;
          max-width: 450px;
          width: 90%;
          position: relative;
          border: 2px solid transparent;
          background-image: linear-gradient(white, white), 
                            linear-gradient(135deg, #ff66b2, #b44cff);
          background-origin: border-box;
          background-clip: padding-box, border-box;
        }

        .game-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          transition: color 0.2s ease;
        }

        .game-close-btn:hover {
          color: #ff0000;
        }

        .game-modal-title {
          background: linear-gradient(90deg, #ff4ea1, #cc1ccc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 1.4rem;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        }

        .game-modal-text {
          font-size: 1rem;
          line-height: 1.6;
          text-align: center;
          color: #333;
          margin-bottom: 30px;
        }

        .game-start-btn {
          background: linear-gradient(90deg, #ff66b2, #b44cff);
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease-in-out;
          display: block;
          margin: 0 auto;
          box-shadow: 0 0 6px rgba(255, 0, 150, 0.4);
        }

        .game-start-btn:hover {
          transform: scale(1.05);
        }

        /* Game Area */
        .game-area-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4000;
        }

        .game-area-container {
          background: #fff0f6;
          border-radius: 12px;
          padding: 20px;
          width: 400px;
          height: 500px;
          position: relative;
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        .game-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .score-pill, .time-pill {
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .score-pill {
          background: rgba(255, 100, 160, 0.15);
          border: 1px solid #ff7eb8;
          color: #ff6b9d;
        }

        .time-pill {
          background: rgba(150, 180, 255, 0.15);
          border: 1px solid #8ca9ff;
          color: #4b7bff;
        }

        .time-warning {
          background: rgba(255, 165, 0, 0.15);
          border-color: #ffa500;
          color: #ff8c00;
          animation: pulse 1s infinite;
        }

        .time-critical {
          background: rgba(255, 0, 0, 0.15);
          border-color: #ff4444;
          color: #ff0000;
          animation: pulse 0.5s infinite;
        }

        .game-play-area {
          width: 100%;
          height: 400px;
          background: linear-gradient(180deg, #fff, #f7eaff);
          border-radius: 8px;
          position: relative;
          overflow: hidden;
          border: 2px solid #ffd6e7;
        }

        .falling-heart {
          position: absolute;
          font-size: 24px;
          cursor: pointer;
          animation: fall 3.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards,
                     wobble 2s ease-in-out infinite;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          opacity: 0.8;
          z-index: 10;
        }

        @keyframes fall {
          0% {
            transform: translateY(0);
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(400px);
            opacity: 0.2;
          }
        }

        @keyframes wobble {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(5px);
          }
        }

        .hello-kitty {
          position: absolute;
          font-size: 32px;
          cursor: pointer;
          animation: kittySlide 4s ease-in-out forwards;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          opacity: 0.9;
          z-index: 20;
        }

        @keyframes kittySlide {
          0% {
            transform: translateX(-100px) translateY(0);
          }
          50% {
            transform: translateX(200px) translateY(200px);
          }
          100% {
            transform: translateX(400px) translateY(400px);
          }
        }

        /* Completion Modal */
        .completion-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 5000;
          animation: overlayFadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .completion-modal {
          background: #ffffff;
          border-radius: 14px;
          padding: 28px 34px;
          max-width: 380px;
          width: 90vw;
          text-align: center;
          position: relative;
          box-shadow: 0 6px 16px rgba(255, 105, 180, 0.25);
          animation: modalBounce 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
        }

        @keyframes modalBounce {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .completion-close-btn {
          position: absolute;
          top: 14px;
          right: 16px;
          background: white;
          border: 1px solid #dddddd;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: #666;
          transition: all 0.2s ease;
        }

        .completion-close-btn:hover {
          background: #ffe6f0;
          color: #ff6b9d;
        }

        .completion-title {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          color: #e92a83;
          font-size: 1.4rem;
          letter-spacing: 0.4px;
          margin-bottom: 15px;
          animation: titlePulse 1.2s ease-in-out 0.4s infinite;
        }

        @keyframes titlePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }

        .completion-icon {
          font-size: 2rem;
          margin-bottom: 15px;
          animation: iconBounce 0.5s ease-out 0.5s both;
        }

        @keyframes iconBounce {
          0% {
            transform: scale(0.5);
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .completion-message {
          font-family: 'Poppins', sans-serif;
          font-weight: 500;
          color: #ff1493;
          font-size: 1rem;
          margin-bottom: 20px;
          animation: slideUp 0.5s ease-out 0.6s both;
        }

        @keyframes slideUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-box {
          border: 2px dashed #ff80c0;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
          background: rgba(255, 255, 255, 0.7);
          font-family: 'Quicksand', sans-serif;
          font-size: 0.95rem;
          color: #4b4b4b;
          line-height: 1.4;
          letter-spacing: 0.3px;
          text-align: center;
          animation: fadeInUp 0.8s ease-out 0.8s both;
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Flying Message Animation */
        .flying-message {
          position: fixed;
          top: 20%;
          left: -300px;
          background: rgba(255, 255, 255, 0.95);
          color: #ff6b9d;
          padding: 12px 20px;
          border-radius: 25px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          font-size: 16px;
          font-weight: 500;
          z-index: 1000;
          animation: flyAcross 3s ease-in-out forwards;
          border: 1px solid rgba(255, 182, 193, 0.3);
          white-space: nowrap;
        }

        @keyframes flyAcross {
          0% {
            left: -300px;
            opacity: 0;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
          70% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            left: 50%;
            transform: translateX(-50%) scale(1);
            opacity: 0;
          }
        }

        section {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          position: relative;
        }

        /* Landing Section */
        .landing {
          background: linear-gradient(135deg, #ffe6f0 0%, #f0f8ff 100%);
          overflow: hidden;
        }

        /* Floating Elements Container */
        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        /* Heart Animations */
        .heart {
          position: absolute;
          font-size: 24px;
          animation: floatHeart 7s ease-in-out infinite;
          opacity: 0.7;
          z-index: 2;
        }

        .heart-1 {
          left: 15%;
          top: 20%;
          animation-delay: 0s;
          animation-duration: 8s;
        }

        .heart-2 {
          right: 20%;
          top: 30%;
          animation-delay: 1s;
          animation-duration: 7s;
        }

        .heart-3 {
          left: 10%;
          top: 60%;
          animation-delay: 2s;
          animation-duration: 9s;
        }

        .heart-4 {
          right: 15%;
          top: 70%;
          animation-delay: 0.5s;
          animation-duration: 6.5s;
        }

        @keyframes floatHeart {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
            opacity: 0.6;
          }
          33% {
            transform: translateY(-20px) rotate(5deg);
            opacity: 0.8;
          }
          66% {
            transform: translateY(-10px) rotate(-3deg);
            opacity: 0.7;
          }
        }

        /* Envelope Animations */
        .envelope {
          position: absolute;
          font-size: 20px;
          animation: floatEnvelope 10s ease-in-out infinite;
          opacity: 0.6;
          z-index: 2;
        }

        .envelope-1 {
          left: 25%;
          top: 80%;
          animation-delay: 0s;
          animation-duration: 12s;
        }

        .envelope-2 {
          right: 25%;
          top: 15%;
          animation-delay: 3s;
          animation-duration: 11s;
        }

        .envelope-3 {
          left: 30%;
          top: 40%;
          animation-delay: 6s;
          animation-duration: 9s;
        }

        @keyframes floatEnvelope {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0.5;
          }
          25% {
            transform: translateY(-25px) translateX(10px);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-15px) translateX(-5px);
            opacity: 0.6;
          }
          75% {
            transform: translateY(-20px) translateX(5px);
            opacity: 0.7;
          }
        }

        /* Sparkle Animations */
        .sparkle {
          position: absolute;
          font-size: 18px;
          animation: sparkleTwinkle 5s ease-in-out infinite;
          z-index: 3;
        }

        .sparkle-1 {
          right: 45%;
          top: 35%;
          animation-delay: 0s;
          animation-duration: 4s;
        }

        .sparkle-2 {
          left: 45%;
          top: 50%;
          animation-delay: 1.5s;
          animation-duration: 3.5s;
        }

        .sparkle-3 {
          right: 40%;
          top: 65%;
          animation-delay: 2.5s;
          animation-duration: 5s;
        }

        .sparkle-4 {
          left: 40%;
          top: 25%;
          animation-delay: 0.7s;
          animation-duration: 4.5s;
        }

        @keyframes sparkleTwinkle {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        /* Kitten Container */
        .kitten-container {
          position: relative;
          z-index: 10;
          margin-bottom: 30px;
        }

        .kitten-image {
          animation: floatKitten 5s ease-in-out infinite;
        }

        .actual-kitten-img {
          width: 200px !important;
          height: 200px !important;
          object-fit: contain;
          filter: drop-shadow(0 8px 20px rgba(0,0,0,0.1));
        }

        @keyframes floatKitten {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .main-heading {
          font-size: 2.8rem;
          color: #ff6b9d;
          margin: 30px 0 20px 0;
          font-weight: 600;
          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
          line-height: 1.2;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
          z-index: 10;
          position: relative;
        }

        /* Envelope Button */
        .envelope-btn {
          background: linear-gradient(135deg, #ff9ec0, #c74ad4);
          color: white;
          border: none;
          padding: 20px 40px;
          border-radius: 30px;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(199, 74, 212, 0.4);
          z-index: 10;
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .envelope-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 25px rgba(199, 74, 212, 0.5);
        }

        .envelope-btn.opening {
          animation: envelopeOpen 0.6s ease-in-out forwards;
        }

        @keyframes envelopeOpen {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }

        .envelope-icon {
          font-size: 24px;
        }

        .btn-text {
          font-size: 16px;
        }

        /* Apology Banner Section */
        .apology-banner {
          background: linear-gradient(135deg, #ffe6f0 0%, #f0f8ff 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
        }

        .apology-content {
          text-align: center;
          width: 100%;
          max-width: 800px;
        }

        .apology-heading {
          font-size: 3.5rem;
          color: #a855f7;
          font-weight: bold;
          margin-bottom: 10px;
          animation: apologyHeadingIn 0.7s ease-out;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
        }

        @keyframes apologyHeadingIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          70% {
            transform: translateY(0) scale(1.03);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .apology-subtext {
          font-size: 1.8rem;
          color: #505050;
          margin-bottom: 15px;
          animation: apologySubtextIn 0.5s ease-out 0.3s both;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
        }

        @keyframes apologySubtextIn {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        .apology-sparkle {
          font-size: 1.5rem;
          margin-bottom: 40px;
          animation: sparkleShimmer 2s ease-in-out infinite;
        }

        @keyframes sparkleShimmer {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        .apology-card {
          background: linear-gradient(90deg, #ff9ec0, white);
          border-radius: 35px;
          padding: 50px 40px;
          margin: 0 auto;
          max-width: 70%;
          position: relative;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          border: 2px solid #f8c8dd;
        }

        .card-heart {
          position: absolute;
          font-size: 1.2rem;
          top: 15px;
        }

        .card-heart-left {
          left: 20px;
        }

        .card-heart-right {
          right: 20px;
        }

        .mail-icon {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          animation: mailFloat 3.5s ease-in-out infinite;
        }

        @keyframes mailFloat {
          0%, 100% {
            transform: translateX(-50%) translateY(-3px);
          }
          50% {
            transform: translateX(-50%) translateY(3px);
          }
        }

        .apology-cta {
          background: none;
          border: none;
          color: #a855f7;
          font-size: 1.5rem;
          font-weight: bold;
          cursor: pointer;
          margin: 20px 0;
          padding: 15px 30px;
          border-radius: 25px;
          transition: all 0.18s ease-out;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
          margin-right: auto;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
        }

        .apology-cta:hover {
          transform: translateY(-2px);
          text-shadow: 0 2px 10px rgba(168, 85, 247, 0.3);
        }

        .cta-icon {
          font-size: 1.2rem;
        }

        .cta-subtext {
          color: #666;
          font-size: 1rem;
          margin-bottom: 15px;
        }

        .bottom-sparkle {
          font-size: 1.2rem;
        }

        /* Letter Popup Overlay */
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: overlayFadeIn 0.38s ease-out;
        }

        @keyframes overlayFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .letter-card {
          background: linear-gradient(135deg, #fff0f5, #f8e1f4);
          border-radius: 35px;
          padding: 40px;
          max-width: 600px;
          width: 70%;
          position: relative;
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          border: 2px solid rgba(255, 182, 193, 0.3);
          animation: cardSlideUp 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
        }

        @keyframes cardSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Close Button */
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 36px;
          height: 36px;
          background: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
          color: #666;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.14s ease-out;
          z-index: 10;
        }

        .close-btn:hover {
          transform: scale(1.08);
          color: #ff6b9d;
        }

        /* Letter Header */
        .letter-header {
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }

        .header-pill {
          background: linear-gradient(135deg, #ff9ec0, #c74ad4);
          padding: 12px 24px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 15px rgba(199, 74, 212, 0.3);
          animation: floatHeader 4s ease-in-out infinite;
        }

        @keyframes floatHeader {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        .pill-text {
          color: white;
          font-size: 18px;
          font-weight: 600;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
        }

        .pill-heart {
          font-size: 16px;
        }

        /* Letter Content */
        .letter-content {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 24px;
          padding: 30px;
          margin-bottom: 25px;
          position: relative;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
          border: 1px solid rgba(255, 182, 193, 0.2);
        }

        /* Margin Decoration */
        .margin-decoration {
          position: absolute;
          left: 15px;
          top: 30px;
          bottom: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .margin-line {
          width: 2px;
          height: 100%;
          background: linear-gradient(to bottom, #ff9ec0, transparent);
          border-radius: 1px;
        }

        .margin-dot {
          width: 6px;
          height: 6px;
          background: #ff9ec0;
          border-radius: 50%;
          margin-top: 10px;
        }

        /* Message Text */
        .message-text {
          margin-left: 30px;
          text-align: left;
        }

        .message-text p {
          color: #555;
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 15px;
          font-family: 'Georgia', serif;
        }

        /* Letter Divider */
        .letter-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #ffb6c1, transparent);
          margin: 25px 0;
        }

        /* Signature Section */
        .signature-section {
          text-align: right;
          margin-bottom: 20px;
        }

        .love-text {
          color: #c74ad4;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
        }

        .signature {
          color: #ff6b9d;
        }

        .sincerely {
          font-size: 14px;
          margin-bottom: 4px;
          font-style: italic;
        }

        .name {
          font-size: 20px;
          font-weight: bold;
          font-family: 'Comic Sans MS', 'Patrick Hand', cursive;
        }

        /* Decorative Icons */
        .decorative-icons {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 20px;
        }

        .deco-heart, .deco-sparkle {
          font-size: 16px;
          animation: iconShimmer 3s ease-in-out infinite;
        }

        .deco-sparkle {
          animation-delay: 1.5s;
        }

        @keyframes iconShimmer {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .main-heading {
            font-size: 2.2rem;
          }
          
          .actual-kitten-img {
            width: 150px !important;
            height: 150px !important;
          }
          
          .flying-message {
            font-size: 14px;
            padding: 10px 18px;
          }
          
          .heart, .envelope {
            font-size: 18px;
          }
          
          .sparkle {
            font-size: 16px;
          }
          
          .letter-card {
            width: 85%;
            padding: 30px 20px;
          }
          
          .envelope-btn {
            padding: 16px 30px;
            font-size: 16px;
          }

          .apology-heading {
            font-size: 2.5rem;
          }

          .apology-card {
            max-width: 90%;
            padding: 40px 20px;
          }

          .apology-cta {
            font-size: 1.2rem;
          }

          .songs-card {
            padding: 40px 20px;
          }

          .songs-title {
            font-size: 2rem;
          }

          .audio-indicator {
            bottom: 10px;
            right: 10px;
          }

          .pulsing-heart {
            font-size: 20px;
          }

          .volume-bar {
            width: 50px;
          }

          .game-area-container {
            width: 90vw;
            height: 70vh;
          }

          .completion-modal {
            padding: 20px;
          }

          .player-controls {
            flex-direction: column;
            gap: 10px;
          }

          .play-all-btn, .stop-btn {
            width: 100%;
          }

          .love-section-title {
            font-size: 2.2rem;
          }
          
          .love-cards-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .speech-bubble {
            font-size: 0.9rem;
            padding: 0.8rem 1rem;
          }
          
          .love-caption {
            font-size: 0.9rem;
          }
          
          .gif-container {
            height: 180px;
          }
        }

        @media (max-width: 480px) {
          .love-section-title {
            font-size: 1.8rem;
          }
          
          .love-section-subtitle {
            font-size: 1rem;
          }
          
          .love-card {
            padding: 1rem;
          }
          
          .gif-container {
            height: 150px;
          }
        }
        				
        /* Happy Birthday & Love You Letter Section */
				.birthday-letter-section {
					background: linear-gradient(135deg, #fff0f7 0%, #f8f4ff 100%);
					min-height: 100vh;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 4rem 2rem;
					position: relative;
				}

				.birthday-card {
					background: white;
					border-radius: 25px;
					box-shadow: 0 15px 35px rgba(0,0,0,0.1);
					max-width: 600px;
					width: 90%;
					overflow: hidden;
					animation: cardFadeIn 1.5s ease-out;
					transition: transform 0.3s ease;
				}

				.birthday-card:hover {
					transform: translateY(-4px);
				}

				@keyframes cardFadeIn {
					0% {
						opacity: 0;
						transform: translateY(20px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}

				/* Header with Gradient */
				.letter-header-gradient {
					background: linear-gradient(135deg, #ff9ec0 0%, #c7c6ff 100%);
					padding: 2rem 1rem;
					text-align: center;
					position: relative;
					animation: headerShimmer 4s ease-in-out infinite;
				}

				@keyframes headerShimmer {
					0%, 100% {
						background: linear-gradient(135deg, #ff9ec0 0%, #c7c6ff 100%);
					}
					50% {
						background: linear-gradient(135deg, #ffb3d1 0%, #d4d3ff 100%);
					}
				}

				.letter-title {
					font-family: 'Poppins', 'Comic Sans MS', cursive;
					font-size: 2.2rem;
					font-weight: bold;
					color: #8b008b;
					margin: 0;
					text-shadow: 0 2px 4px rgba(0,0,0,0.1);
				}

				.sparkle-left,
				.sparkle-right {
					animation: sparkleFlicker 2s ease-in-out infinite;
					display: inline-block;
				}

				.sparkle-left {
					margin-right: 15px;
					animation-delay: 0.5s;
				}

				.sparkle-right {
					margin-left: 15px;
					animation-delay: 1s;
				}

				@keyframes sparkleFlicker {
					0%, 100% {
						opacity: 0.7;
						transform: scale(1);
					}
					50% {
						opacity: 1;
						transform: scale(1.2);
					}
				}

				/* Letter Content Box */
				.letter-content-box {
					background: #fffafc;
					border: 2px dashed #ffb6c1;
					border-radius: 20px;
					margin: 2rem;
					padding: 2.5rem 2rem;
					box-shadow: inset 0 2px 8px rgba(255,182,193,0.1);
				}

				.birthday-poem {
					font-family: 'Dancing Script', 'Poppins', cursive;
					font-size: 1.4rem;
					line-height: 1.8;
					color: #555;
					text-align: center;
				}

				.birthday-poem p {
					margin: 0.8rem 0;
					position: relative;
				}

				.birthday-poem p::after {
					content: ' ✨';
					opacity: 0.6;
					animation: twinkle 3s ease-in-out infinite;
				}

				@keyframes twinkle {
					0%, 100% {
						opacity: 0.3;
					}
					50% {
						opacity: 0.8;
					}
				}

				.poem-spacer {
					height: 1.5rem;
					background: linear-gradient(to right, transparent, #ffb6c1, transparent);
					margin: 1.5rem auto;
					width: 80%;
					border-radius: 2px;
				}

				/* Bottom Decorations */
				.letter-bottom-decor {
					text-align: center;
					padding: 1.5rem;
					background: linear-gradient(180deg, transparent, #fffafc);
				}

				.decor-heart,
				.decor-sparkle {
					font-size: 1.8rem;
					margin: 0 10px;
					animation: pulseHeart 2s ease-in-out infinite;
					display: inline-block;
				}

				.decor-sparkle {
					animation-delay: 0.7s;
				}

				.decor-heart:last-child {
					animation-delay: 1.4s;
				}

				@keyframes pulseHeart {
					0%, 100% {
						transform: scale(1);
						opacity: 0.8;
					}
					50% {
						transform: scale(1.1);
						opacity: 1;
					}
				}

				/* Responsive Design */
				@media (max-width: 768px) {
					.birthday-letter-section {
						padding: 2rem 1rem;
					}

					.letter-title {
						font-size: 1.8rem;
					}

					.birthday-poem {
						font-size: 1.2rem;
					}

					.letter-content-box {
						margin: 1.5rem;
						padding: 2rem 1.5rem;
					}

					.sparkle-left,
					.sparkle-right {
						margin: 0 8px;
					}
				}

				@media (max-width: 480px) {
					.letter-title {
						font-size: 1.5rem;
					}

					.birthday-poem {
						font-size: 1.1rem;
					}

					.letter-content-box {
						margin: 1rem;
						padding: 1.5rem 1rem;
					}

					.decor-heart,
					.decor-sparkle {
						font-size: 1.5rem;
						margin: 0 5px;
					}
				}
        
        /* This Is Us Btw 💞 Section */
				.this-is-us-section {
					background: linear-gradient(180deg, #fffaf9 0%, #fff9ff 100%);
					min-height: 100vh;
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 4rem 2rem;
					position: relative;
				}

				.us-container {
					background: #fff9e9;
					border: 2px solid #263255;
					border-radius: 14px;
					padding: 20px 28px;
					box-shadow: 0 4px 14px rgba(255, 160, 220, 0.15);
					max-width: 650px;
					width: 90%;
					animation: fadeUpIn 0.8s ease-out;
				}

				@keyframes fadeUpIn {
					0% {
						opacity: 0;
						transform: translateY(30px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}

				/* Title Box */
				.us-title-box {
					background: white;
					border: 2px solid #24314a;
					border-radius: 8px;
					padding: 10px 18px;
					text-align: center;
					box-shadow: 0 3px 6px rgba(255, 160, 200, 0.2);
					font-family: 'Poppins', 'Quicksand', sans-serif;
					font-weight: 600;
					font-size: 1rem;
					color: #33325d;
					margin-bottom: 20px;
					animation: titleSlideUp 0.5s ease-out 0.2s both;
				}

				@keyframes titleSlideUp {
					0% {
						opacity: 0;
						transform: translateY(15px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.us-title-box {
					animation: emojiPulse 2s ease-in-out infinite;
				}

				@keyframes emojiPulse {
					0%, 100% {
						opacity: 0.8;
					}
					50% {
						opacity: 1;
					}
				}

				/* Divider Line with Hearts */
				.us-divider {
					text-align: center;
					margin: 20px 0;
					position: relative;
					animation: fadeIn 0.3s ease-out;
				}

				.us-divider::before {
					content: '';
					position: absolute;
					top: 50%;
					left: 0;
					right: 0;
					height: 1.5px;
					border-top: 1.5px dashed #ff8ac8;
					transform: translateY(-50%);
				}

				.divider-heart, .divider-sparkle {
					position: relative;
					z-index: 2;
					background: #fff9e9;
					padding: 0 10px;
					animation: heartPulse 2s ease-in-out infinite;
					display: inline-block;
				}

				.divider-sparkle {
					animation-delay: 0.7s;
				}

				.divider-heart:last-child {
					animation-delay: 1.4s;
				}

				@keyframes heartPulse {
					0%, 100% {
						opacity: 0.6;
						transform: scale(1);
					}
					50% {
						opacity: 1;
						transform: scale(1.2);
					}
				}

				/* GIF Container */
				.us-gif-container {
					border-radius: 12px;
					overflow: hidden;
					box-shadow: 0 6px 18px rgba(255, 105, 180, 0.2);
					margin: 20px 0;
					animation: gifZoomIn 0.7s ease-out 0.4s both;
				}

				@keyframes gifZoomIn {
					0% {
						opacity: 0;
						transform: scale(0.95);
					}
					100% {
						opacity: 1;
						transform: scale(1);
					}
				}

				.us-gif {
					width: 100%;
					height: auto;
					border-radius: 12px;
					transition: all 0.4s ease-in-out;
					display: block;
				}

				.us-gif-container:hover .us-gif {
					transform: scale(1.03);
				}

				/* Caption Text */
				.us-caption {
					font-family: 'Poppins', 'Quicksand', sans-serif;
					font-weight: 300;
					font-size: 1rem;
					color: #5a5363;
					text-align: center;
					line-height: 1.5;
					margin-top: 12px;
					font-style: italic;
					animation: captionFloat 0.6s ease-out 0.8s both, floatAnimation 3s ease-in-out infinite 1.4s;
				}

				@keyframes captionFloat {
					0% {
						opacity: 0;
						transform: translateY(10px);
					}
					100% {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes floatAnimation {
					0%, 100% {
						transform: translateY(-3px);
					}
					50% {
						transform: translateY(3px);
					}
				}

				/* Responsive Design */
				@media (max-width: 768px) {
					.this-is-us-section {
						padding: 2rem 1rem;
					}
					
					.us-container {
						padding: 15px 20px;
					}
					
					.us-title-box {
						font-size: 0.9rem;
						padding: 8px 15px;
					}
					
					.us-caption {
						font-size: 0.9rem;
					}
				}

				@media (max-width: 480px) {
					.us-container {
						padding: 12px 15px;
					}
					
					.us-title-box {
						font-size: 0.85rem;
						padding: 6px 12px;
					}
					
					.divider-heart, .divider-sparkle {
						padding: 0 6px;
					}
					
					.us-caption {
						font-size: 0.85rem;
					}
				}
        			/* Final Message & Floating Hearts Outro */
			.final-outro-section {
				background: linear-gradient(180deg, #ffd6e8 0%, #e6d4ff 100%);
				min-height: 100vh;
				display: flex;
				align-items: center;
				justify-content: center;
				position: relative;
				overflow: hidden;
				animation: backgroundFadeOut 15s ease-in-out forwards;
			}

			@keyframes backgroundFadeOut {
				0% {
					background: linear-gradient(180deg, #ffd6e8 0%, #e6d4ff 100%);
				}
				50% {
					background: linear-gradient(180deg, #f8c8dd 0%, #d8c8ff 100%);
				}
				80% {
					background: linear-gradient(180deg, #f0b8d2 0%, #c8b8ff 100%);
				}
				100% {
					background: linear-gradient(180deg, #e8a8c8 0%, #b8a8ff 100%);
				}
			}

			/* Floating Hearts Container */
			.floating-hearts-container {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				pointer-events: none;
			}

			.floating-heart {
				position: absolute;
				bottom: -50px;
				animation: floatUp 14s ease-in-out infinite;
				filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
				z-index: 1;
			}

			@keyframes floatUp {
				0% {
					transform: translateY(0) translateX(0) rotate(0deg);
					opacity: 0;
				}
				10% {
					opacity: 0.7;
				}
				90% {
					opacity: 0.4;
				}
				100% {
					transform: translateY(-120vh) translateX(20px) rotate(360deg);
					opacity: 0;
				}
			}
				/* Final Message & Floating Hearts Outro */
				.final-outro-section {
					background: linear-gradient(180deg, #ffd6e8 0%, #e6d4ff 100%);
					min-height: 40vh;
					display: flex;
					align-items: center;
					justify-content: center;
					position: relative;
					overflow: hidden;
					animation: backgroundFadeOut 15s ease-in-out forwards;
				}

				@keyframes backgroundFadeOut {
					0% {
						background: linear-gradient(180deg, #ffd6e8 0%, #e6d4ff 100%);
					}
					50% {
						background: linear-gradient(180deg, #f8c8dd 0%, #d8c8ff 100%);
					}
					80% {
						background: linear-gradient(180deg, #f0b8d2 0%, #c8b8ff 100%);
					}
					100% {
						background: linear-gradient(180deg, #e8a8c8 0%, #b8a8ff 100%);
					}
				}

				/* Floating Hearts Container */
				.floating-hearts-container {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
					pointer-events: none;
				}

				.floating-heart {
					position: absolute;
					bottom: -50px;
					animation: floatUp 12s ease-in-out infinite;
					filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
					z-index: 1;
				}

				@keyframes floatUp {
					0% {
						transform: translateY(0) translateX(0) rotate(0deg);
						opacity: 0;
					}
					10% {
						opacity: 0.7;
					}
					90% {
						opacity: 0.4;
					}
					100% {
						transform: translateY(-120vh) translateX(20px) rotate(360deg);
						opacity: 0;
					}
				}

				/* Final Message Container */
				.final-message-container {
					position: relative;
					z-index: 2;
					text-align: center;
					animation: messageFadeInOut 2s ease-in-out forwards;
				}

				@keyframes messageFadeIn {
					0% {
						opacity: 0;
						transform: scale(0.98);
					}
					100% {
						opacity: 0;
						transform: scale(1);
					}
				}

				.final-message {
					font-family: 'Dancing Script', 'Playfair Display', cursive;
					text-align: center;
					padding: 25px 40px;
					border-radius: 20px;
					backdrop-filter: blur(10px);
					background: linear-gradient(90deg, #970960ff, #8808a4ff);
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
					animation: textGlow 3s ease-in-out infinite;
				}

				/* Main heading */
				.final-message h2 {
					font-size: 2rem;
					margin-bottom: 10px;
					text-shadow:
						0 0 20px rgba(255, 200, 255, 0.6),
						0 0 40px rgba(255, 180, 255, 0.4),
						0 1px 4px rgba(0, 0, 0, 0.15);
				}

				/* Signature line */
				.final-message p {
					font-size: 1.3rem;
					margin: 0;
					font-style: italic;
					text-shadow:
						0 0 10px rgba(255, 180, 255, 0.5),
						0 0 25px rgba(255, 150, 255, 0.3);
				}

				.signature {
					font-weight: 600;
				}

				/* Glow animation */
				@keyframes textGlow {
					0%, 100% {
						text-shadow:
							0 0 15px rgba(255, 180, 255, 0.6),
							0 0 30px rgba(255, 150, 255, 0.4),
							0 2px 8px rgba(0, 0, 0, 0.2);
					}
					50% {
						text-shadow:
							0 0 25px rgba(255, 200, 255, 0.8),
							0 0 50px rgba(255, 160, 255, 0.5),
							0 4px 12px rgba(0, 0, 0, 0.3);
					}
				}


				/* Background Pulse Heart */
				.pulse-heart {
					position: absolute;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					font-size: 8rem;
					opacity: 0.1;
					animation: heartbeat 2s ease-in-out infinite, finalFade 17s ease-in-out forwards;
					z-index: 0;
					filter: blur(8px);
				}

				@keyframes heartbeat {
					0%, 100% {
						transform: translate(-50%, -50%) scale(1);
						opacity: 0.08;
					}
					50% {
						transform: translate(-50%, -50%) scale(1.1);
						opacity: 0.12;
					}
				}

				@keyframes finalFade {
					0%, 80% {
						opacity: 0.1;
					}
					100% {
						opacity: 0;
					}
				}


				/* Responsive Design */
				@media (max-width: 768px) {
					.final-message {
						font-size: 2rem;
						padding: 15px 30px;
					}
					
					.pulse-heart {
						font-size: 6rem;
					}
				}

				@media (max-width: 768px) {
					.final-message {
						font-size: 1.3rem;
						padding: 12px 24px;
					}
					
					.pulse-heart {
						font-size: 3.5rem;
					}
				}




      `}</style>
    </div>
  )
}