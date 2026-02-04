import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../lib/api-config';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';

    try {
        const response = await fetch(`${getBackendUrl()}/notifications?limit=${limit}`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}
