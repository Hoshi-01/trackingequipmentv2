import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('ADMIN_PASSWORD not set in environment');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        if (password === adminPassword) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Password salah' }, { status: 401 });
        }
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
