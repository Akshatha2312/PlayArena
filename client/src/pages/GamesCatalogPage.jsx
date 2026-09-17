import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { GameCard } from '../components/GameCard';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Pagination } from '../components/Pagination';
import { Filter } from 'lucide-react';
import './GamesCatalogPage.css';

const CATEGORIES = [
  { id: 'all', label: 'All Activities' },
  { id: 'court', label: 'Court Sports' },
  { id: 'table', label: 'Table Sports' },
  { id: 'esports', label: 'eSports & Simulators' },
  { id: 'vr', label: 'Virtual Reality' },
  { id: 'arcade', label: 'Arcade Zone' },
];

export const GamesCatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedCategory = searchParams.get('category') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = { page: currentPage, limit: 12 };
    if (selectedCategory !== 'all') {
      query.category = selectedCategory;
    }

    gameService
      .getGames(query)
      .then((res) => {
        setGames(res.data.games || []);
        setPagination(res.pagination || {});
      })
      .catch((err) => {
        setError(err.message || 'Failed to load games catalog');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedCategory, currentPage]);

  const handleCategoryChange = (catId) => {
    const params = new URLSearchParams();
    if (catId !== 'all') {
      params.set('category', catId);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  return (
    <div className="container page-container">
      <div className="compact-page-header">
        <h1 className="page-title">GAMES & ACTIVITIES CATALOG</h1>
        <p className="page-subtitle">Select an indoor game or sport to explore available courts, tables, and gaming rigs.</p>
      </div>

      {/* Compact Category Filter Bar */}
      <div className="compact-toolbar">
        <div className="compact-toolbar-left">
          <span className="filter-label">
            <Filter size={15} style={{ color: '#00e5ff', marginRight: 4 }} /> Filter Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Catalog Content */}
      {loading ? (
        <LoadingState message="Fetching active Play Arena games..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      ) : games.length === 0 ? (
        <EmptyState
          title="No Games Found"
          message={`No games are currently available in the selected category "${selectedCategory}".`}
        />
      ) : (
        <>
          <div className="games-grid">
            {games.map((game) => (
              <GameCard key={game._id || game.id} game={game} />
            ))}
          </div>

          <Pagination
            currentPage={pagination.page || currentPage}
            totalPages={pagination.totalPages || 1}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit || 12}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
};

