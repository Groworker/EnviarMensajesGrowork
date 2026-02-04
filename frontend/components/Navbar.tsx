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
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex flex-shrink-0 items-center gap-3">
                                <Image
                                    src="/growork-logo-black.png"
                                    alt="Growork Logo"
                                    width={40}
                                    height={40}
                                    className="object-contain"
                                />
                                <span className="text-xl font-bold text-blue-600">CV Sender</span>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`inline-flex items-center px-1 pt-1 text-sm border-b-2 border-transparent hover:border-gray-300 transition-colors ${isActive(item.href)
                                            ? 'font-bold text-gray-900'
                                            : 'font-medium text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        {/* Right side actions */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsConfigModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                                title="Configuración de Envíos"
                            >
                                <Settings size={18} />
                                <span className="hidden md:inline">Configuración Envíos</span>
                            </button>
                        </div>
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

