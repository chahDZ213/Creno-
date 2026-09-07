'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON, SUPABASE_URL } from './config';

export const navigateur = () => createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
