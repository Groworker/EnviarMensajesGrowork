import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../../lib/api-config';

export async function GET() {
    try {
        const response = await fetch(`${getBackendUrl()}/notifications/unread/count`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json(
            { error: 'Failed to fetch unread count' },
            { status: 500 }
        );
    }
}
