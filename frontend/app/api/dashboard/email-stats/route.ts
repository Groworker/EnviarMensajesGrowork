import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../lib/api-config';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '30';

    try {
        const response = await fetch(`${getBackendUrl()}/dashboard/email-stats?days=${days}`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching email stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch email stats' },
            { status: 500 }
        );
    }
}
