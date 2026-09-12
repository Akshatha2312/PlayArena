import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { gameService } from '../services/gameService';
import { GameCard } from '../components/GameCard';
import { LoadingState, ErrorState, EmptyState } from '../components/StateComponents';
import { Trophy, Filter } from 'lucide-react';
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

    const query = { page: currentPage, limit: 9 };
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
      <div className="catalog-header">
        <div>
          <h1 className="page-title">GAMES & ACTIVITIES CATALOG</h1>
          <p className="page-subtitle">Select an indoor game or sport to explore available courts, tables, and gaming rigs.</p>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="filter-bar">
        <span className="filter-label">
          <Filter className="filter-icon" /> Filter Category:
        </span>
        <div className="category-pills">
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

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn btn-secondary"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
