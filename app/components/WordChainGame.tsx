import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { Word } from "../lib/words"

interface WordChainGameProps {
  words: Word[];
}

export default function WordChainGame({ words }: WordChainGameProps) {
  const [currentWord, setCurrentWord] = useState<string>("")
  const [userInput, setUserInput] = useState<string>("")
  const [wordChain, setWordChain] = useState<string[]>([])
  const [errorCount, setErrorCount] = useState<number>(0)
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "dead" | "showAnswers">("waiting")
  const [correctAnswers, setCorrectAnswers] = useState<Word[]>([])
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Initialize audio context
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitContext)()
    }
  }, [])

  const playSound = (frequency: number, duration: number, type: "correct" | "error" | "type" = "type") => {
    if (!soundEnabled || !audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime)
    oscillator.type = type === "correct" ? "sine" : type === "error" ? "sawtooth" : "square"

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration)

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + duration)
  }

  const isValidWord = (word: string): boolean => {
    return words.some((w) => w.word.toLowerCase() === word.toLowerCase().trim())
  }

  const getRandomWord = (): string => {
    const randomIndex = Math.floor(Math.random() * words.length)
    return words[randomIndex].word
  }

  const startGame = (baseWord?: string) => {
    if (baseWord && !isValidWord(baseWord)) {
      alert("请输入词库中存在的单词！")
      return
    }

    const word = baseWord || getRandomWord()
    setCurrentWord(word)
    setWordChain([word])
    setUserInput("")
    setErrorCount(0)
    setGameStatus("playing")
    setCorrectAnswers([])
  }

  const findValidNextWords = (word: string): Word[] => {
    const lastChar = word.toLowerCase().slice(-1)
    return words.filter(
      (w) =>
        w.word.toLowerCase().startsWith(lastChar) &&
        w.word.toLowerCase() !== word.toLowerCase() &&
        !wordChain.map((chain) => chain.toLowerCase()).includes(w.word.toLowerCase()),
    )
  }

  const isValidNextWord = (prevWord: string, nextWord: string): boolean => {
    const lastChar = prevWord.toLowerCase().slice(-1)
    const firstChar = nextWord.toLowerCase().charAt(0)
    const wordExists = words.some((w) => w.word.toLowerCase() === nextWord.toLowerCase())
    const notUsed = !wordChain.map((w) => w.toLowerCase()).includes(nextWord.toLowerCase())

    return lastChar === firstChar && wordExists && notUsed
  }

  const handleSubmit = () => {
    if (!userInput.trim()) return

    playSound(200, 0.1, "type")

    if (isValidNextWord(currentWord, userInput.trim())) {
      // Correct answer
      playSound(523, 0.3, "correct") // C5 note
      const newChain = [...wordChain, userInput.trim()]
      setWordChain(newChain)
      setCurrentWord(userInput.trim())
      setUserInput("")
      setErrorCount(0)

      // Check if game is dead (no valid next words)
      const validNext = findValidNextWords(userInput.trim())
      if (validNext.length === 0) {
        setGameStatus("dead")
      }
    } else {
      // Wrong answer
      playSound(147, 0.5, "error") // D3 note
      const newErrorCount = errorCount + 1
      setErrorCount(newErrorCount)

      if (newErrorCount >= 3) {
        const answers = findValidNextWords(currentWord)
        setCorrectAnswers(answers)
        setGameStatus("showAnswers")
      }
    }
  }

  const continueGame = () => {
    setGameStatus("playing")
    setErrorCount(0)
    setCorrectAnswers([])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && gameStatus === "playing") {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold text-center flex-1">🔗 单词接龙游戏</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Game Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 justify-center">
              <Button onClick={() => startGame()} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                随机开始
              </Button>
              <div className="flex gap-2">
                <Input
                  placeholder="输入基准单词"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && gameStatus === "waiting") {
                      if (userInput.trim() && !isValidWord(userInput.trim())) {
                        alert("请输入词库中存在的单词！")
                        return
                      }
                      startGame(userInput.trim())
                    }
                  }}
                  className="w-40"
                />
                <Button
                  onClick={() => {
                    if (userInput.trim() && !isValidWord(userInput.trim())) {
                      alert("请输入词库中存在的单词！")
                      return
                    }
                    startGame(userInput.trim())
                  }}
                  disabled={!userInput.trim()}
                >
                  开始接龙
                </Button>
              </div>
              <Button variant="outline" onClick={() => setGameStatus("waiting")} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Game Area */}
        {gameStatus !== "waiting" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {gameStatus === "dead" ? "💀 死龙~ 游戏结束！" : "🎮 游戏进行中"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Word Chain Display */}
              <div className="flex flex-wrap gap-2 justify-center">
                {wordChain.map((word, index) => (
                  <Badge
                    key={index}
                    variant={index === wordChain.length - 1 ? "default" : "secondary"}
                    className="text-lg px-3 py-1"
                  >
                    {word}
                  </Badge>
                ))}
              </div>

              {/* Current Word */}
              {gameStatus === "playing" && (
                <div className="text-center">
                  <p className="text-lg mb-2">
                    当前单词: <span className="font-bold text-2xl text-blue-600">{currentWord}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    请输入以 "<span className="font-bold text-red-500">{currentWord.slice(-1).toUpperCase()}</span>"
                    开头的单词
                  </p>

                  <div className="flex gap-2 justify-center max-w-md mx-auto">
                    <Input
                      placeholder="输入下一个单词"
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value)
                        playSound(300, 0.05, "type")
                      }}
                      onKeyPress={handleKeyPress}
                      className="text-center"
                    />
                    <Button onClick={handleSubmit} disabled={!userInput.trim()}>
                      提交
                    </Button>
                  </div>

                  {errorCount > 0 && <p className="text-red-500 mt-2">错误次数: {errorCount}/3</p>}
                </div>
              )}

              {/* Show Answers */}
              {gameStatus === "showAnswers" && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-semibold">错误次数过多！以下是正确答案:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {correctAnswers.slice(0, 5).map((answer, index) => (
                          <div key={index} className="bg-green-50 p-2 rounded border">
                            <span className="font-bold">{answer.word}</span> - {answer.definition}
                          </div>
                        ))}
                      </div>
                      <Button onClick={continueGame} className="mt-2">
                        继续游戏
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Game Rules */}
        <Card>
          <CardHeader>
            <CardTitle>游戏规则</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>输入单词必须以上一个单词的最后一个字母开头</li>
              <li>不能重复使用已经用过的单词</li>
              <li>错误超过3次会显示正确答案</li>
              <li>当无法找到下一个单词时游戏结束（死龙）</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 