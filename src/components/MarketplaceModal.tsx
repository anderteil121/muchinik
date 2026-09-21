import React, { useState } from 'react';
import { GameState, User, Item, MarketItem } from '../types';
import { Button, Input, Modal, Tooltip } from './ui';
import { 
  Store, 
  Coins, 
  Search, 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  AlertCircle, 
  Package, 
  Sparkles,
  Users,
  Info,
  ShieldCheck
} from 'lucide-react';

interface MarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  currentUser: User;
  initialSelectedItemId?: number | null;
  initialListItemId?: number | null;
}

export function MarketplaceModal({ 
  isOpen, 
  onClose, 
  state, 
  currentUser,
  initialSelectedItemId,
  initialListItemId
}: MarketplaceModalProps) {
  const [search, setSearch] = useState('');
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [isManageBalancesOpen, setIsManageBalancesOpen] = useState(false);
  const [editingMarketItem, setEditingMarketItem] = useState<MarketItem | null>(null);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const effectiveInitialItemId = initialListItemId ?? initialSelectedItemId;

  // Pre-open listing modal if initialSelectedItemId was supplied
  React.useEffect(() => {
    if (isOpen && effectiveInitialItemId) {
      setIsListingModalOpen(true);
    }
  }, [isOpen, effectiveInitialItemId]);

  // Clear feedback after 4 seconds
  React.useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';
  const userBalance = Number(currentUser.balance) || 0;
  const marketItems = state.marketItems || [];

  // Match market items with item data
  const enrichedMarketItems = marketItems.map(m => {
    const itemData = state.items.find(i => i.id === m.itemId);
    return {
      ...m,
      item: itemData
    };
  }).filter(m => m.item !== undefined);

  const filteredItems = enrichedMarketItems.filter(m => {
    if (!m.item) return false;
    const nameMatch = m.item.name.toLowerCase().includes(search.toLowerCase());
    const descMatch = m.item.description.toLowerCase().includes(search.toLowerCase());
    return nameMatch || descMatch;
  });

  const handleBuy = async (marketItemId: number, itemPrice: number, itemName: string) => {
    if (userBalance < itemPrice) {
      setFeedback({ type: 'error', message: `Недостаточно монет! Нужно ${itemPrice} 🪙, у вас ${userBalance} 🪙.` });
      return;
    }

    setBuyingId(marketItemId);
    setFeedback(null);

    try {
      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          marketItemId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Ошибка при покупке' });
      } else {
        setFeedback({ type: 'success', message: `Успешно приобретено: "${itemName}"!` });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Ошибка связи с сервером' });
    } finally {
      setBuyingId(null);
    }
  };

  const handleRemove = async (marketItemId: number) => {
    if (!confirm('Снять этот предмет с продажи на торговой площадке?')) return;

    try {
      const res = await fetch('/api/market/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: marketItemId,
          adminId: currentUser.id
        })
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Предмет снят с продажи' });
      }
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Ошибка при удалении' });
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
        <div className="bg-zinc-900 border border-amber-500/30 shadow-2xl shadow-amber-950/20 w-full max-w-4xl max-h-[90vh] rounded-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner">
                <Store size={22} />
              </div>
              <div>
                <h2 className="font-serif text-xl sm:text-2xl text-amber-500 font-bold tracking-wide flex items-center gap-2">
                  Торговая площадка
                </h2>
                <p className="text-xs text-zinc-400 font-serif">
                  Лавка артефактов и снаряжения академии
                </p>
              </div>
            </div>

            {/* Balance Card / Admin Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Student / User Balance */}
              <div className="bg-gradient-to-r from-amber-950/60 to-zinc-900 border border-amber-500/40 px-4 py-2 rounded-sm flex items-center gap-3 shadow-md">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-semibold text-amber-500/80 tracking-wider">
                    {isAdmin ? 'Ваш баланс' : 'Баланс ученика'}
                  </span>
                  <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-lg">
                    <Coins size={18} className="text-amber-400" />
                    <span>{userBalance}</span>
                    <span className="text-xs text-amber-500/70 font-sans font-normal">монет</span>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => setIsListingModalOpen(true)}
                    className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-500 shadow-amber-900/30"
                  >
                    <Plus size={14} /> Выставить предмет
                  </Button>
                  <Button 
                    onClick={() => setIsManageBalancesOpen(true)}
                    variant="secondary"
                    className="text-xs gap-1.5"
                    title="Выдать монеты ученикам"
                  >
                    <Users size={14} /> Балансы
                  </Button>
                </div>
              )}

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded-sm hover:bg-zinc-800 transition-colors ml-auto sm:ml-2"
                title="Закрыть"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search Bar & Feedback Alert */}
          <div className="px-4 py-3 bg-zinc-950/40 border-b border-zinc-800/80 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск предметов на рынке..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-sm py-1.5 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {!isAdmin && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 italic">
                <Info size={13} className="text-zinc-400 shrink-0" />
                <span>Способ заработка монет станет доступен позже</span>
              </div>
            )}
          </div>

          {feedback && (
            <div className={`px-4 py-2.5 text-xs font-medium border-b flex items-center gap-2 animate-in fade-in shrink-0 ${
              feedback.type === 'success' 
                ? 'bg-green-950/40 border-green-900/50 text-green-400' 
                : 'bg-red-950/40 border-red-900/50 text-red-400'
            }`}>
              {feedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Goods Catalog */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600">
                  <Package size={28} />
                </div>
                <h3 className="font-serif text-lg text-zinc-400">
                  {search ? 'Ничего не найдено по вашему запросу' : 'Торговая площадка пуста'}
                </h3>
                <p className="text-sm text-zinc-600 max-w-sm">
                  {isAdmin 
                    ? 'Вы можете выставить на продажу любой предмет из Базы знаний, указав желаемую цену.' 
                    : 'Архимаги пока не выставили предметы на продажу. Загляните сюда позже!'}
                </p>
                {isAdmin && (
                  <Button 
                    onClick={() => setIsListingModalOpen(true)} 
                    className="mt-2 text-xs gap-2"
                  >
                    <Plus size={14} /> Выставить первый предмет
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(({ id: marketId, price, stock, item, sellerId, sellerName }) => {
                  if (!item) return null;
                  const canAfford = userBalance >= price;
                  const isBuyingThis = buyingId === marketId;

                  const sellerUser = sellerId ? state.users.find(u => Number(u.id) === Number(sellerId)) : null;
                  const sellerDisplayName = sellerUser 
                    ? (sellerUser.nickname || sellerUser.fullname || sellerUser.username)
                    : (sellerName || 'Архимаг');

                  return (
                    <div 
                      key={marketId}
                      className="bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/30 transition-all rounded-sm p-4 flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Sub-glow background */}
                      <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

                      <div>
                        {/* Top: Icon + Name + Admin Actions */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="relative shrink-0">
                            {item.iconUrl ? (
                              <img 
                                src={item.iconUrl} 
                                alt="" 
                                className="w-12 h-12 object-cover rounded-sm border border-zinc-800 group-hover:border-amber-500/50 transition-colors" 
                              />
                            ) : (
                              <div className="w-12 h-12 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-600 font-mono text-sm">
                                ?
                              </div>
                            )}
                            {item.isStackable && (
                              <span className="absolute -bottom-1 -right-1 text-[9px] bg-zinc-900 border border-zinc-700 text-zinc-400 px-1 rounded font-mono">
                                ∞
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-serif font-bold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
                              {item.name}
                            </h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.target && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                                  {item.target === 'self' ? 'На себя' : 'На союзника'}
                                </span>
                              )}
                              {item.duration && item.duration > 0 ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400/90 border border-amber-900/40 font-mono">
                                  {item.duration} сек
                                </span>
                              ) : null}
                              {stock !== undefined && stock !== -1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-900/40 font-mono">
                                  Осталось: {stock}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Admin Controls */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setEditingMarketItem({ id: marketId, itemId: item.id, price, stock })}
                                className="p-1.5 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 rounded-sm transition-colors"
                                title="Изменить цену или остаток"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleRemove(marketId)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-sm transition-colors"
                                title="Снять с продажи"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-zinc-400 line-clamp-3 mb-3 leading-relaxed font-sans">
                          {item.description}
                        </p>

                        {/* Seller Admin Info */}
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 rounded px-2 py-1 mb-3">
                          {sellerUser?.photoUrl ? (
                            <img src={sellerUser.photoUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover border border-amber-500/40 shrink-0" />
                          ) : (
                            <ShieldCheck size={13} className="text-amber-400 shrink-0" />
                          )}
                          <span className="text-zinc-500">Выставил:</span>
                          <span className="text-amber-300 font-medium truncate font-serif" title={`Выставил: ${sellerDisplayName}`}>
                            {sellerDisplayName}
                          </span>
                        </div>
                      </div>

                      {/* Bottom: Price + Buy Button */}
                      <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-base">
                          <Coins size={16} className="text-amber-500" />
                          <span>{price}</span>
                          <span className="text-xs text-zinc-500 font-sans font-normal">🪙</span>
                        </div>

                        <Button
                          onClick={() => handleBuy(marketId, price, item.name)}
                          disabled={!canAfford || isBuyingThis}
                          variant={canAfford ? 'primary' : 'secondary'}
                          className={`text-xs px-3 py-1.5 gap-1.5 shrink-0 ${
                            canAfford 
                              ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-500' 
                              : 'opacity-50 text-zinc-500 border-zinc-800'
                          }`}
                        >
                          {isBuyingThis ? (
                            'Покупка...'
                          ) : canAfford ? (
                            <>
                              <Sparkles size={13} /> Купить
                            </>
                          ) : (
                            'Не хватает монет'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Submodal: List Item from Knowledge Base */}
      {isListingModalOpen && (
        <ListItemModal
          isOpen={isListingModalOpen}
          onClose={() => setIsListingModalOpen(false)}
          onSuccess={(itemName) => {
            setFeedback({ type: 'success', message: `«${itemName}» успешно выставлен на торговую площадку!` });
          }}
          state={state}
          adminId={currentUser.id}
          initialItemId={effectiveInitialItemId}
        />
      )}

      {/* Admin Submodal: Edit Market Item */}
      {editingMarketItem && (
        <EditMarketItemModal
          isOpen={Boolean(editingMarketItem)}
          onClose={() => setEditingMarketItem(null)}
          marketItem={editingMarketItem}
        />
      )}

      {/* Admin Submodal: Manage Student Balances */}
      {isManageBalancesOpen && (
        <ManageBalancesModal
          isOpen={isManageBalancesOpen}
          onClose={() => setIsManageBalancesOpen(false)}
          state={state}
          adminId={currentUser.id}
        />
      )}
    </>
  );
}

// Submodal: List an Item from Knowledge Base onto the Market
export function ListItemModal({
  isOpen,
  onClose,
  onSuccess,
  state,
  adminId,
  initialItemId
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (itemName: string) => void;
  state: GameState;
  adminId: number;
  initialItemId?: number | null;
}) {
  const [selectedItemId, setSelectedItemId] = useState<number>(initialItemId || (state.items[0]?.id || 0));
  const [price, setPrice] = useState<number>(100);
  const [isUnlimitedStock, setIsUnlimitedStock] = useState<boolean>(true);
  const [stock, setStock] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    }
  }, [initialItemId]);

  const filteredItems = state.items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const selectedItem = state.items.find(i => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError('Выберите предмет из базы знаний');
      return;
    }
    if (price < 0) {
      setError('Цена не может быть отрицательной');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/market/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          price,
          stock: isUnlimitedStock ? -1 : stock,
          adminId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка добавления');
      }

      onSuccess?.(selectedItem?.name || 'Предмет');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сервера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выставить предмет на рынок">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-sm">
            {error}
          </div>
        )}

        {/* Item Selector */}
        <div className="space-y-2">
          <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">
            Предмет из Базы знаний
          </label>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Фильтр предметов базы..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-1.5 pl-8 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-sm">
            {filteredItems.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`w-full text-left p-2 rounded-sm flex items-center gap-2.5 transition-colors text-xs ${
                  selectedItemId === item.id 
                    ? 'bg-amber-950/40 border border-amber-500/50 text-amber-300' 
                    : 'hover:bg-zinc-900 text-zinc-300 border border-transparent'
                }`}
              >
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt="" className="w-6 h-6 object-cover rounded-sm shrink-0" />
                ) : (
                  <div className="w-6 h-6 bg-zinc-900 rounded-sm flex items-center justify-center font-mono text-[10px] text-zinc-500 shrink-0">?</div>
                )}
                <span className="truncate flex-1 font-medium">{item.name}</span>
              </button>
            ))}
            {filteredItems.length === 0 && (
              <div className="text-xs text-zinc-600 text-center py-4">Предметы не найдены</div>
            )}
          </div>
        </div>

        {/* Selected Item Preview */}
        {selectedItem && (
          <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-sm flex items-center gap-3">
            {selectedItem.iconUrl ? (
              <img src={selectedItem.iconUrl} alt="" className="w-10 h-10 object-cover rounded-sm border border-zinc-800 shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-500 shrink-0">?</div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-serif font-semibold text-zinc-200 text-sm truncate">{selectedItem.name}</div>
              <div className="text-[11px] text-zinc-400 line-clamp-1">{selectedItem.description}</div>
            </div>
          </div>
        )}

        {/* Price Input */}
        <div className="space-y-1.5">
          <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Coins size={14} /> Цена (в монетах 🪙)
          </label>
          <Input
            type="number"
            min="0"
            value={price}
            onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
            placeholder="Например: 150"
            required
          />
        </div>

        {/* Stock / Quantity */}
        <div className="space-y-2 pt-1">
          <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">
            Количество на складе
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input 
                type="checkbox"
                checked={isUnlimitedStock}
                onChange={e => setIsUnlimitedStock(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Неограниченно</span>
            </label>
            {!isUnlimitedStock && (
              <Input
                type="number"
                min="1"
                value={stock}
                onChange={e => setStock(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-xs py-1"
                placeholder="Шт."
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading || !selectedItemId} className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-500">
            {loading ? 'Публикация...' : 'Выставить на рынок'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Submodal: Edit Listing Price / Stock
function EditMarketItemModal({
  isOpen,
  onClose,
  marketItem
}: {
  isOpen: boolean;
  onClose: () => void;
  marketItem: MarketItem;
}) {
  const [price, setPrice] = useState<number>(marketItem.price);
  const [isUnlimitedStock, setIsUnlimitedStock] = useState<boolean>(marketItem.stock === -1 || marketItem.stock === undefined);
  const [stock, setStock] = useState<number>(marketItem.stock && marketItem.stock > 0 ? marketItem.stock : 10);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch('/api/market/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: marketItem.id,
          price,
          stock: isUnlimitedStock ? -1 : stock
        })
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать товар на рынке">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Coins size={14} /> Цена (в монетах 🪙)
          </label>
          <Input
            type="number"
            min="0"
            value={price}
            onChange={e => setPrice(Math.max(0, parseInt(e.target.value) || 0))}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">
            Количество на складе
          </label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input 
                type="checkbox"
                checked={isUnlimitedStock}
                onChange={e => setIsUnlimitedStock(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span>Неограниченно</span>
            </label>
            {!isUnlimitedStock && (
              <Input
                type="number"
                min="1"
                value={stock}
                onChange={e => setStock(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-xs py-1"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold border-amber-500">
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Submodal: Manage Student Balances (Archmage feature to set/award coins)
function ManageBalancesModal({
  isOpen,
  onClose,
  state,
  adminId
}: {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  adminId: number;
}) {
  const students = state.users.filter(u => u.role === 'student');
  const [search, setSearch] = useState('');
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [customBalances, setCustomBalances] = useState<Record<number, number>>({});

  const filteredStudents = students.filter(s => {
    const name = (s.nickname || s.fullname || s.username).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleSetBalance = async (userId: number, newBalance: number) => {
    setSavingUserId(userId);
    try {
      await fetch('/api/admin/set-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          balance: newBalance,
          adminId
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleQuickAdd = async (student: User, amount: number) => {
    const current = Number(student.balance) || 0;
    await handleSetBalance(student.id, current + amount);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Управление балансами учеников">
      <div className="space-y-4 max-h-[65vh] flex flex-col">
        <p className="text-xs text-zinc-400">
          Вы можете вручную начислять или изменять баланс монет любого ученика академии.
        </p>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск ученика..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-1.5 pl-8 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {filteredStudents.map(student => {
            const currentBalance = Number(student.balance) || 0;
            const isSaving = savingUserId === student.id;
            const inputVal = customBalances[student.id] !== undefined ? customBalances[student.id] : currentBalance;

            return (
              <div 
                key={student.id} 
                className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 font-mono text-xs shrink-0">
                      👤
                    </div>
                  )}
                  <div className="truncate">
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {student.nickname || student.fullname || student.username}
                    </div>
                    <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                      <Coins size={10} /> {currentBalance} 🪙
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleQuickAdd(student, 50)}
                    disabled={isSaving}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 px-2 py-1 rounded"
                    title="+50 монет"
                  >
                    +50
                  </button>
                  <button
                    onClick={() => handleQuickAdd(student, 200)}
                    disabled={isSaving}
                    className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 px-2 py-1 rounded"
                    title="+200 монет"
                  >
                    +200
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={inputVal}
                      onChange={e => setCustomBalances(prev => ({ ...prev, [student.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-16 bg-zinc-900 border border-zinc-700 text-amber-400 font-mono text-xs px-1.5 py-1 rounded focus:outline-none focus:border-amber-500"
                    />
                    <Button
                      onClick={() => handleSetBalance(student.id, inputVal)}
                      disabled={isSaving}
                      variant="secondary"
                      className="text-[11px] px-2 py-1 h-auto"
                    >
                      {isSaving ? '...' : 'Ок'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStudents.length === 0 && (
            <div className="text-zinc-600 text-center py-6 text-xs">Ученики не найдены</div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </Modal>
  );
}
