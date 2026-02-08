'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import GlobalConfigModal from './GlobalConfigModal';
import Image from 'next/image';

export default function Navbar() {
    const pathname = usePathname();
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const navItems = [
        { href: '/dashboard', label: 'Panel de Control' },
        { href: '/clients', label: 'Clientes' },
        { href: '/notifications', label: 'Notificaciones' },
        { href: '/cv-creators', label: 'Creadores CV' },
        { href: '/dominios', label: 'Dominios' },
        { href: '/preview-emails', label: 'Preview Emails' },
        { href: '/responses', label: 'Respuestas' },
    ];

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname?.startsWith(href);
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
                <div className="mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-14 items-center justify-between">
                        <div className="flex items-center">
                            <Link href="/dashboard" className="flex flex-shrink-0 items-center gap-2 mr-6">
                                <Image
                                    src="/growork-logo-black.png"
                                    alt="Growork Logo"
                                    width={32}
                                    height={32}
                                    className="object-contain"
                                />
                                <span className="text-lg font-bold text-blue-600 hidden lg:inline">CV Sender</span>
                            </Link>
                            <div className="hidden md:flex items-center gap-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive(item.href)
                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => setIsConfigModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            title="Configuracion de Envios"
                        >
                            <Settings size={16} />
                            <span className="hidden lg:inline">Configuracion</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Global Config Modal */}
            <GlobalConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
            />
        </>
    );
}

