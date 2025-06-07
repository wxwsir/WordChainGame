"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Play, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { loadAllWords } from "./lib/words"
import WordChainGame from "./components/WordChainGame"

interface Word {
  word: string
  definition: string
}

const defaultWords: Word[] = [
  { word: "apple", definition: "n. 苹果" },
  { word: "elephant", definition: "n. 大象" },
  { word: "table", definition: "n. 桌子" },
  { word: "energy", definition: "n. 能量" },
  { word: "yellow", definition: "adj. 黄色的" },
  { word: "water", definition: "n. 水" },
  { word: "rabbit", definition: "n. 兔子" },
  { word: "tiger", definition: "n. 老虎" },
  { word: "red", definition: "adj. 红色的" },
  { word: "dog", definition: "n. 狗" },
  { word: "green", definition: "adj. 绿色的" },
  { word: "notebook", definition: "n. 笔记本" },
  { word: "keyboard", definition: "n. 键盘" },
  { word: "door", definition: "n. 门" },
  { word: "river", definition: "n. 河流" },
  { word: "rainbow", definition: "n. 彩虹" },
  { word: "window", definition: "n. 窗户" },
  { word: "orange", definition: "n. 橙子 adj. 橙色的" },
  { word: "education", definition: "n. 教育" },
  { word: "nature", definition: "n. 自然" },
]

const WORDS_STORAGE_KEY = "word-chain-game-words"

export default async function Home() {
  const words = await loadAllWords()
  return <WordChainGame words={words} />
}
