import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialisation du client Supabase via les variables d'environnement
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Villes gabonaises autorisées
const VALID_CITIES = ['Libreville', 'Port-Gentil', 'Franceville'] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_chat_id, keyword, max_price, city } = body;

    // Validation du chat ID Telegram (obligatoire)
    if (!telegram_chat_id || typeof telegram_chat_id !== 'string' || !telegram_chat_id.trim()) {
      return NextResponse.json(
        { error: 'Le champ telegram_chat_id est obligatoire.' },
        { status: 400 }
      );
    }

    // Validation du mot-clé (obligatoire)
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return NextResponse.json(
        { error: 'Le champ keyword est obligatoire.' },
        { status: 400 }
      );
    }

    // Validation du prix maximum (optionnel, doit être un entier positif)
    if (max_price !== null && max_price !== undefined) {
      if (typeof max_price !== 'number' || !Number.isInteger(max_price) || max_price < 0) {
        return NextResponse.json(
          { error: 'Le prix maximum doit être un entier positif.' },
          { status: 400 }
        );
      }
    }

    // Validation de la ville (optionnelle, doit appartenir à la liste autorisée)
    if (city && !VALID_CITIES.includes(city)) {
      return NextResponse.json(
        { error: `Ville invalide. Valeurs acceptées : ${VALID_CITIES.join(', ')}.` },
        { status: 400 }
      );
    }

    // Insertion de l'alerte dans Supabase
    const { error: dbError } = await supabase.from('alerts').insert({
      telegram_chat_id: telegram_chat_id.trim(),
      keyword: keyword.trim(),
      max_price: max_price ?? null,
      city: city || null,
    });

    if (dbError) {
      console.error('[API /subscribe] Erreur Supabase :', dbError.message);
      return NextResponse.json(
        { error: "Impossible d'enregistrer l'alerte. Veuillez réessayer." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    console.error('[API /subscribe] Erreur inattendue :', err);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
