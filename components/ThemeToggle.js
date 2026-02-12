"use client";

import { useState, useEffect } from 'react';
import { IconMoon, IconSun } from '@/components/Icons';

export default function ThemeToggle() {
    const [dark, setDark] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('cpnv-theme');
        if (saved === 'dark') {
            setDark(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggle = () => {
        const next = !dark;
        setDark(next);
        if (next) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('cpnv-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('cpnv-theme', 'light');
        }
    };

    return (
        <button onClick={toggle} className="theme-toggle" title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
    );
}
