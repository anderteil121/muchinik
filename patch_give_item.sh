sed -i -e '/const \[itemId, setItemId\] = useState<number | '\'''\'>('\'''\'');/a\
  const [search, setSearch] = useState('\'''\'');\
  \
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));' src/components/AdminPanel.tsx

sed -i -e '/<div className="space-y-4">/a\
        <div className="relative">\
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />\
          <input \
            type="text" \
            placeholder="Поиск предмета..." \
            value={search}\
            onChange={e => setSearch(e.target.value)}\
            className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1.5 pl-7 pr-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50"\
          />\
        </div>' src/components/AdminPanel.tsx

sed -i -e 's/{items.map(item => (/{filteredItems.map(item => (/g' src/components/AdminPanel.tsx
sed -i -e 's/{items.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">Нет доступных предметов<\/div>}/{filteredItems.length === 0 \&\& <div className="text-zinc-600 text-sm text-center py-4">{items.length === 0 ? '\''Нет доступных предметов'\'' : '\''Ничего не найдено'\''}<\/div>}/g' src/components/AdminPanel.tsx
