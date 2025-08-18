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
    if (username.includes('/') || username.includes('\\')) {
      return NextResponse.json({ success: false, error: 'Invalid username' }, { status: 400 });
    }

    const userDir = path.join(BASE_DIR, username);
    const userFile = path.join(userDir, 'user.json');
    const chatsFile = path.join(userDir, 'chats.json');

    // ensure base dir exists
    await fs.mkdir(BASE_DIR, { recursive: true });

    // prevent overwriting existing user
    try {
      await fs.access(userFile);
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 409 });
    } catch {
      // file does not exist -> ok to create
    }

    const hash = await bcrypt.hash(password, 10);

    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(userFile, JSON.stringify({ username, passwordHash: hash }, null, 2), 'utf8');
    await fs.writeFile(chatsFile, JSON.stringify([], null, 2), 'utf8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
