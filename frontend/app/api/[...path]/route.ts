import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '../../../lib/api-config';

// Universal Proxy Handler
async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;

    // Construct the backend URL
    // path is an array like ['clients', '1'] -> join to 'clients/1'
    const pathString = path.join('/');
    const queryString = request.nextUrl.search; // includes ?limit=10 etc
    const backendUrl = `${getBackendUrl()}/${pathString}${queryString}`;

    console.log(`[Proxy] Forwarding ${request.method} ${request.nextUrl.pathname} -> ${backendUrl}`);

    try {
        const headers = new Headers(request.headers);
        // Clean up headers that might cause issues
        headers.delete('host');
        headers.delete('connection');

        // Prepare fetch options
        const fetchOptions: RequestInit = {
            method: request.method,
            headers: headers,
            cache: 'no-store', // Never cache API responses by default
        };

        // If body is present (POST/PUT/PATCH), forward it
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
            // Check if there is body content
            const contentType = request.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    const body = await request.clone().json();
                    fetchOptions.body = JSON.stringify(body);
                } catch (e) {
                    // Body might be empty
                }
            } else if (contentType) {
                // Forward text/blob/form-data as is if possible, but for JSON APIs text/json is main concern
                // For now, stream passing might be complex in Edge functions or strict Node envs without duplex: 'half'
                // Let's stick to JSON handling primarily for this SPA
                try {
                    const text = await request.clone().text();
                    if (text) fetchOptions.body = text;
                } catch (e) { }
            }
        }

        const response = await fetch(backendUrl, fetchOptions);

        // Forward info back to client
        const data = await response.text();

        // Try parsing JSON to return JSON response, or text if not
        try {
            const json = JSON.parse(data);
            return NextResponse.json(json, {
                status: response.status,
                headers: {
                    // Forward essential headers like content-type
                    'Content-Type': response.headers.get('Content-Type') || 'application/json'
                }
            });
        } catch (e) {
            return new NextResponse(data, {
                status: response.status,
                headers: {
                    'Content-Type': response.headers.get('Content-Type') || 'text/plain'
                }
            });
        }

    } catch (error) {
        console.error(`[Proxy Error] ${backendUrl}:`, error);
        return NextResponse.json(
            { error: 'Internal Proxy Error', details: String(error) },
            { status: 500 }
        );
    }
}

// Export handler for all standard HTTP methods
export async function GET(req: NextRequest, props: any) { return handleProxy(req, props); }
export async function POST(req: NextRequest, props: any) { return handleProxy(req, props); }
export async function PUT(req: NextRequest, props: any) { return handleProxy(req, props); }
export async function PATCH(req: NextRequest, props: any) { return handleProxy(req, props); }
export async function DELETE(req: NextRequest, props: any) { return handleProxy(req, props); }
