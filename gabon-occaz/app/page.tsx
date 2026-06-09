'use client';

import { useState } from 'react';
import { Search, MapPin, ExternalLink, Bell } from 'lucide-react';

// -------------------------------------------------------
// Données fictives réalistes pour le prototype
// -------------------------------------------------------
const mockListings = [
  {
    id: '1',
    title: 'Toyota Vitz 2015 – Très bon état',
    price: 4500000,
    category: 'Véhicule',
    city: 'Libreville',
    image_url: 'https://placehold.co/400x300/f97316/ffffff?text=Toyota+Vitz',
    source_url: '#',
  },
  {
    id: '2',
    title: 'iPhone 13 Pro 256 Go – Débloqué',
    price: 380000,
    category: 'Électronique',
    city: 'Libreville',
    image_url: 'https://placehold.co/400x300/3b82f6/ffffff?text=iPhone+13+Pro',
    source_url: '#',
  },
  {
    id: '3',
    title: 'Mitsubishi Pajero 2012 – 4x4 Diesel',
    price: 7200000,
    category: 'Véhicule',
    city: 'Port-Gentil',
    image_url: 'https://placehold.co/400x300/f97316/ffffff?text=Pajero+4x4',
    source_url: '#',
  },
  {
    id: '4',
    title: 'Samsung Galaxy S22 Ultra – 512 Go',
    price: 290000,
    category: 'Électronique',
    city: 'Franceville',
    image_url: 'https://placehold.co/400x300/3b82f6/ffffff?text=Galaxy+S22',
    source_url: '#',
  },
  {
    id: '5',
    title: 'Toyota Land Cruiser 200 – 2017',
    price: 18500000,
    category: 'Véhicule',
    city: 'Libreville',
    image_url: 'https://placehold.co/400x300/f97316/ffffff?text=Land+Cruiser',
    source_url: '#',
  },
  {
    id: '6',
    title: 'MacBook Pro M1 2021 – 16 Go RAM',
    price: 850000,
    category: 'Électronique',
    city: 'Port-Gentil',
    image_url: 'https://placehold.co/400x300/3b82f6/ffffff?text=MacBook+Pro',
    source_url: '#',
  },
];

// Formate un prix en FCFA avec séparateur de milliers
function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
}

// Classe CSS du badge de catégorie
function categoryBadgeClass(category: string): string {
  return category === 'Véhicule'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-emerald-100 text-emerald-700';
}

export default function HomePage() {
  // État de la recherche
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');

  // État du formulaire d'alerte
  const [alertForm, setAlertForm] = useState({
    telegram_chat_id: '',
    keyword: '',
    max_price: '',
    city: '',
  });
  const [alertStatus, setAlertStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [alertMessage, setAlertMessage] = useState('');

  // Filtrage côté client sur les mock data
  const filteredListings = mockListings.filter((l) => {
    const matchKeyword = keyword
      ? l.title.toLowerCase().includes(keyword.toLowerCase())
      : true;
    const matchCategory = category ? l.category === category : true;
    const matchCity = city ? l.city === city : true;
    return matchKeyword && matchCategory && matchCity;
  });

  // Soumission du formulaire d'alerte vers l'API
  async function handleAlertSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAlertStatus('loading');
    setAlertMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alertForm,
          max_price: alertForm.max_price ? parseInt(alertForm.max_price, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur inconnue');
      }
      setAlertStatus('success');
      setAlertMessage('Alerte créée avec succès ! Vous recevrez vos notifications sur Telegram.');
      setAlertForm({ telegram_chat_id: '', keyword: '', max_price: '', city: '' });
    } catch (err: unknown) {
      setAlertStatus('error');
      setAlertMessage(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* En-tête fixe */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-orange-500 text-white rounded-xl px-3 py-1 font-black text-xl tracking-tight">
            GO
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Gabon Occaz</h1>
            <p className="text-xs text-gray-500">
              Trouvez les meilleures affaires d&apos;occasion au Gabon
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Hero + barre de recherche */}
        <section className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-1">
            Toutes les annonces d&apos;occasion du Gabon, au même endroit.
          </h2>
          <p className="text-orange-100 mb-6 text-sm md:text-base">
            Véhicules, smartphones, électronique — comparez et trouvez l&apos;affaire idéale.
          </p>
          <div className="bg-white rounded-xl p-3 flex flex-col md:flex-row gap-3">
            {/* Champ mot-clé */}
            <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              <Search className="text-gray-400 shrink-0" size={18} />
              <input
                type="text"
                placeholder="Rechercher (ex: Toyota Vitz, iPhone…)"
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-400"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            {/* Filtre catégorie */}
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Toutes catégories</option>
              <option value="Véhicule">Véhicule</option>
              <option value="Électronique">Électronique</option>
            </select>
            {/* Filtre ville */}
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 outline-none"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Toutes les villes</option>
              <option value="Libreville">Libreville</option>
              <option value="Port-Gentil">Port-Gentil</option>
              <option value="Franceville">Franceville</option>
            </select>
          </div>
        </section>

        {/* Grille d'annonces */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {filteredListings.length} annonce{filteredListings.length !== 1 ? 's' : ''} trouvée{filteredListings.length !== 1 ? 's' : ''}
          </h3>
          {filteredListings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-40" />
              <p>Aucune annonce ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="w-full h-48 object-cover bg-gray-100"
                  />
                  <div className="p-4 space-y-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryBadgeClass(listing.category)}`}
                    >
                      {listing.category}
                    </span>
                    <h4 className="font-semibold text-gray-900 leading-snug line-clamp-2">
                      {listing.title}
                    </h4>
                    <p className="text-orange-500 font-bold text-lg">
                      {formatPrice(listing.price)}
                    </p>
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <MapPin size={13} />
                      <span>{listing.city}</span>
                    </div>
                    <a
                      href={listing.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-2 w-full bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-sm py-2 rounded-lg transition-colors"
                    >
                      Voir l&apos;annonce originale
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section Alertes Telegram */}
        <section className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-500 text-white rounded-xl p-2">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Créer une alerte Telegram</h3>
              <p className="text-sm text-gray-500">
                Recevez une notification instantanée dès qu&apos;une annonce correspond à vos critères.
              </p>
            </div>
          </div>
          <form onSubmit={handleAlertSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ID Telegram */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">ID Telegram (Chat ID)</label>
              <input
                type="text"
                required
                placeholder="ex: 123456789"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
                value={alertForm.telegram_chat_id}
                onChange={(e) => setAlertForm({ ...alertForm, telegram_chat_id: e.target.value })}
              />
            </div>
            {/* Mot-clé alerte */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Mot-clé</label>
              <input
                type="text"
                required
                placeholder="ex: Toyota, iPhone, Samsung…"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
                value={alertForm.keyword}
                onChange={(e) => setAlertForm({ ...alertForm, keyword: e.target.value })}
              />
            </div>
            {/* Prix max */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Prix maximum (FCFA)</label>
              <input
                type="number"
                placeholder="ex: 5000000"
                min={0}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-orange-300"
                value={alertForm.max_price}
                onChange={(e) => setAlertForm({ ...alertForm, max_price: e.target.value })}
              />
            </div>
            {/* Ville alerte */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Ville</label>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-orange-300"
                value={alertForm.city}
                onChange={(e) => setAlertForm({ ...alertForm, city: e.target.value })}
              >
                <option value="">Toutes les villes</option>
                <option value="Libreville">Libreville</option>
                <option value="Port-Gentil">Port-Gentil</option>
                <option value="Franceville">Franceville</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={alertStatus === 'loading'}
                className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {alertStatus === 'loading' ? 'Enregistrement…' : 'Créer une alerte'}
              </button>
            </div>
            {alertMessage && (
              <p
                className={`md:col-span-2 text-sm font-medium ${
                  alertStatus === 'success' ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {alertMessage}
              </p>
            )}
          </form>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="mt-12 py-6 border-t border-gray-200 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Gabon Occaz — Agrégateur d&apos;annonces d&apos;occasion. Aucun paiement traité.
      </footer>
    </div>
  );
}
