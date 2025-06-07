"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"

interface Word {
  word: string
  definition: string
}

const loadWordsFromTxt = async () => {
  try {
    const wordFiles = [
      '1.txt',
      '2.txt',
      '3.txt',
      '4.txt',
      '5.txt',
      '6.txt',
      '7.txt'
    ];

    const allWords: Word[] = [];
    
    for (const file of wordFiles) {
      try {
        const encodedFile = encodeURIComponent(file);
        const response = await fetch(`/words/${encodedFile}`);
        const text = await response.text();
        const words = text.split('\n')
          .filter(line => line.trim())
          .map(line => {
            const [word, definition] = line.split('\t');
            return { word: word?.trim() || '', definition: definition?.trim() || '' };
          })
          .filter(word => word.word);
        
        allWords.push(...words);
      } catch (error) {
        console.error(`加载词库文件 ${file} 失败:`, error);
      }
    }
    
    return allWords;
  } catch (error) {
    console.error('加载词库失败:', error);
    return [];
  }
};

const defaultWords: Word[] = loadWordsFromTxt();

const WORDS_STORAGE_KEY = "word-chain-game-words"

export default function WordChainGame() {
  const [words, setWords] = useState<Word[]>([])
  const [currentWord, setCurrentWord] = useState<string>("")
  const [userInput, setUserInput] = useState<string>("")
  const [wordChain, setWordChain] = useState<string[]>([])
  const [errorCount, setErrorCount] = useState<number>(0)
  const [gameStatus, setGameStatus] = useState<"waiting" | "playing" | "dead" | "showAnswers">("waiting")
  const [correctAnswers, setCorrectAnswers] = useState<Word[]>([])
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  // 移除这行状态声明
  // const [uploadText, setUploadText] = useState<string>("")

  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    // Initialize audio context
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitContext)()
    }
  }, [])

  useEffect(() => {
    // 从localStorage读取词库数据
    const savedWords = localStorage.getItem(WORDS_STORAGE_KEY)
    if (savedWords) {
      try {
        const parsedWords = JSON.parse(savedWords)
        setWords(parsedWords)
      } catch (error) {
        console.error("Failed to parse saved words:", error)
        setWords(defaultWords)
        localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(defaultWords))
      }
    } else {
      // 首次使用，保存默认词库
      setWords(defaultWords)
      localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(defaultWords))
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

  const parseWordList = (text: string): Word[] => {
    const lines = text.split("\n").filter((line) => line.trim())
    const parsed: Word[] = []

    lines.forEach((line) => {
      const parts = line.split("\t")
      if (parts.length >= 2) {
        const word = parts[0].trim()
        const definition = parts.slice(1).join(" ").trim()
        parsed.push({ word, definition })
      }
    })

    return parsed
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".txt")) {
      alert("请上传txt格式的文件")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (!content) {
        alert("文件读取失败")
        return
      }

      try {
        const newWords = parseWordList(content)
        if (newWords.length > 0) {
          const updatedWords = [...words, ...newWords]
          setWords(updatedWords)
          localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(updatedWords))
          alert(`成功添加 ${newWords.length} 个单词到词库！`)
          // 清空文件输入
          event.target.value = ""
        } else {
          alert("未能解析到有效单词，请检查格式")
        }
      } catch (error) {
        alert("解析失败，请检查文件格式")
      }
    }

    reader.onerror = () => {
      alert("文件读取出错")
    }

    reader.readAsText(file, "UTF-8")
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

        {/* Word Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              上传词库
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>支持上传txt格式文件，格式示例:</p>
              <code className="block bg-gray-100 p-2 rounded mt-1">
                back adv. 回原处 n. 背,后面 adj. 后面的 v. 后退
                <br />
                significant adj. 重要的,意义重大的
                <br />
                skill n. 技能,技巧
              </code>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-600">点击选择txt文件上传</span>
                <Button type="button" variant="outline" onClick={() => document.getElementById("file-upload")?.click()}>
                  选择文件
                </Button>
              </label>
            </div>
            <p className="text-sm text-gray-500">当前词库包含 {words.length} 个单词</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("确定要重置词库到默认状态吗？这将删除所有上传的词库！")) {
                    setWords(defaultWords)
                    localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(defaultWords))
                    alert("词库已重置到默认状态")
                  }
                }}
              >
                重置词库
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <li>可以上传自定义词库扩展游戏内容</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
