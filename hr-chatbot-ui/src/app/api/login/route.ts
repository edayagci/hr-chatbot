import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const BASE_DIR = '/Users/edaeylulyagci/Desktop/hr-chatbot/hr-chatbot-ui/login-info';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password required' }, { status: 400 });
    }

    const userDir = path.join(BASE_DIR, username);
    const userFile = path.join(userDir, 'user.json');

    let raw: string;
    try {
      raw = await fs.readFile(userFile, 'utf8');
    } catch {
      return NextResponse.json({ success: false, error: 'User does not exist' }, { status: 404 });
    }

    const data = JSON.parse(raw) as { username: string; passwordHash: string };
    const ok = await bcrypt.compare(password, data.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
