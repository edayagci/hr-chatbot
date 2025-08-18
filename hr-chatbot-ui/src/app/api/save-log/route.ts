import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

const logPath = path.resolve('./chat-logs/chatlog.json');

export async function POST(req: Request) {
  const data = await req.json();

  try {
    let logs = [];

    try {
      const file = await fs.readFile(logPath, 'utf8');
      logs = JSON.parse(file);
    } catch {
      logs = [];
    }

    logs.push(data);
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, JSON.stringify(logs, null, 2));

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ status: 'error', error });
  }
}
