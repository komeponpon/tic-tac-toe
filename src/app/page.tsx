'use client'

import { useState, useEffect } from 'react'
import ReactConfetti from 'react-confetti'
import useSound from 'use-sound'

// 勝利条件のパターン
const WINNING_PATTERNS = [
  [0, 1, 2], // 横一列
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // 縦一列
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // 斜め
  [2, 4, 6],
]

// 型定義
interface GameStats {
  wins: number
  losses: number
  draws: number
}

// APIとの通信関数
async function fetchGameStats(): Promise<GameStats> {
  const response = await fetch('/api/game-stats')
  const data = await response.json()
  return data as GameStats
}

async function saveGameResult(result: 'win' | 'lose' | 'draw', playerMark: 'X' | 'O'): Promise<GameStats> {
  const response = await fetch('/api/game-stats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ result, playerMark }),
  })
  const data = await response.json()
  return data as GameStats
}

// AIの次の手を決定する関数
const getAIMove = (squares: Array<string | null>): number => {
  // 空いているマスを探す
  const availableMoves = squares.map((square, index) => square === null ? index : null).filter((index): index is number => index !== null)
  
  // 勝てるマスがあれば、そこを選ぶ
  for (const move of availableMoves) {
    const testSquares = [...squares]
    testSquares[move] = 'O'
    if (calculateWinner(testSquares) === 'O') {
      return move
    }
  }

  // プレイヤーが次に勝てるマスがあれば、そこを防ぐ
  for (const move of availableMoves) {
    const testSquares = [...squares]
    testSquares[move] = 'X'
    if (calculateWinner(testSquares) === 'X') {
      return move
    }
  }

  // 中央が空いていれば、中央を選ぶ
  if (squares[4] === null) {
    return 4
  }

  // ランダムに選ぶ
  return availableMoves[Math.floor(Math.random() * availableMoves.length)]
}

// 勝者を判定する関数
const calculateWinner = (squares: Array<string | null>): string | null => {
  for (const [a, b, c] of WINNING_PATTERNS) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a]
    }
  }
  return null
}

export default function Home() {
  const [squares, setSquares] = useState<Array<string | null>>(Array(9).fill(null))
  const [isXNext, setIsXNext] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showLoseEffect, setShowLoseEffect] = useState(false)
  const [gameStats, setGameStats] = useState<GameStats>({ wins: 0, losses: 0, draws: 0 })

  // 効果音の設定
  const [playWin] = useSound('/sounds/win.mp3')
  const [playLose] = useSound('/sounds/lose.mp3')
  const [playDraw] = useSound('/sounds/draw.mp3')

  // 成績を取得
  useEffect(() => {
    fetchGameStats().then(stats => setGameStats(stats))
  }, [])

  // 勝敗が決まったときの処理
  const handleGameEnd = async (result: 'win' | 'lose' | 'draw') => {
    if (result === 'win') {
      setShowConfetti(true)
      playWin()
      setTimeout(() => setShowConfetti(false), 5000)
    } else if (result === 'lose') {
      setShowLoseEffect(true)
      playLose()
      setTimeout(() => setShowLoseEffect(false), 2000)
    } else {
      playDraw()
    }

    // 結果を保存
    const newStats = await saveGameResult(result, 'X')
    setGameStats(newStats)
  }

  // AIの手番を処理
  useEffect(() => {
    if (!isXNext && !calculateWinner(squares) && squares.some(square => square === null)) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(squares)
        const nextSquares = squares.slice()
        nextSquares[aiMove] = 'O'
        setSquares(nextSquares)
        setIsXNext(true)

        // AIの手で勝利した場合
        const winner = calculateWinner(nextSquares)
        if (winner === 'O') {
          handleGameEnd('lose')
        } else if (nextSquares.every(square => square !== null)) {
          handleGameEnd('draw')
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isXNext, squares])

  const handleClick = (i: number) => {
    if (calculateWinner(squares) || squares[i] || !isXNext) {
      return
    }
    const nextSquares = squares.slice()
    nextSquares[i] = 'X'
    setSquares(nextSquares)
    setIsXNext(false)

    // プレイヤーの手で勝利した場合
    const winner = calculateWinner(nextSquares)
    if (winner === 'X') {
      handleGameEnd('win')
    } else if (nextSquares.every(square => square !== null)) {
      handleGameEnd('draw')
    }
  }

  const winner = calculateWinner(squares)
  const isDraw = !winner && squares.every(square => square !== null)
  const status = winner 
    ? `Winner: ${winner}` 
    : isDraw 
    ? 'Draw!'
    : `${isXNext ? 'あなた' : 'AI'}の番です`

  const StatusDisplay = () => (
    <div className="mb-6 text-2xl font-semibold text-center text-slate-700 flex items-center justify-center gap-2">
      <span>{status}</span>
      {!winner && !isDraw && (
        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-xl
          ${isXNext ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'}`}>
          {isXNext ? 'X' : 'O'}
        </div>
      )}
    </div>
  )

  const GameStats = () => (
    <div className="mb-6 text-lg text-slate-600">
      <h2 className="font-bold mb-2 text-center">対戦成績</h2>
      <div className="flex justify-center gap-4">
        <div className="text-blue-600">勝ち: {gameStats.wins}</div>
        <div className="text-rose-600">負け: {gameStats.losses}</div>
        <div className="text-slate-600">引分: {gameStats.draws}</div>
      </div>
    </div>
  )

  const resetGame = () => {
    setSquares(Array(9).fill(null))
    setIsXNext(true)
    setShowConfetti(false)
    setShowLoseEffect(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      {showConfetti && <ReactConfetti />}
      <div className={`transition-all duration-500 ${showLoseEffect ? 'opacity-50 scale-95' : ''}`}>
        <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200">
          <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
            マルバツゲーム
          </h1>
          <GameStats />
          <StatusDisplay />
          <div className="grid grid-cols-3 gap-3 mb-6">
            {squares.map((square, i) => (
              <button
                key={i}
                className={`w-24 h-24 rounded-lg text-5xl font-bold flex items-center justify-center transition-all transform hover:scale-105
                  ${!square && 'bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border-2 border-slate-200'}
                  ${square === 'X' && 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-2 border-blue-400'}
                  ${square === 'O' && 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-2 border-rose-400'}`}
                onClick={() => handleClick(i)}
                disabled={!isXNext || !!winner || !!squares[i]}
              >
                {square}
              </button>
            ))}
          </div>
          <button
            onClick={resetGame}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-lg font-semibold rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-105"
          >
            Reset Game
          </button>
        </div>
      </div>
    </main>
  )
}
