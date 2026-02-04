import { NextResponse } from 'next/server';
import { getBackendUrl } from '../../../../lib/api-config';

export async function GET() {
    try {
        const response = await fetch(`${getBackendUrl()}/dashboard/pipeline`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching pipeline:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pipeline' },
            { status: 500 }
        );
    }
}
