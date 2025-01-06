import { NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'game_stats.db'))

// テーブルの作成
db.exec(`
  CREATE TABLE IF NOT EXISTS game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result TEXT NOT NULL,
    player_mark TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export async function GET() {
  try {
    const stmt = db.prepare(`
      SELECT 
        COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN result = 'lose' THEN 1 END) as losses,
        COUNT(CASE WHEN result = 'draw' THEN 1 END) as draws
      FROM game_stats
    `)
    const stats = stmt.get()
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { result, playerMark } = await request.json()
    const stmt = db.prepare('INSERT INTO game_stats (result, player_mark) VALUES (?, ?)')
    stmt.run(result, playerMark)
    
    // 更新された統計を返す
    const statsStmt = db.prepare(`
      SELECT 
        COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
        COUNT(CASE WHEN result = 'lose' THEN 1 END) as losses,
        COUNT(CASE WHEN result = 'draw' THEN 1 END) as draws
      FROM game_stats
    `)
    const stats = statsStmt.get()
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save result' }, { status: 500 })
  }
} 