import React, { useState, useEffect } from 'react';
import { User, GameState } from '../types';
import { Button, Input, Modal, Select, Tooltip } from './ui';
import { format } from 'date-fns';
import { UserCircle, Swords, BookOpen, Clock, Settings, UserPlus, Upload, X, Pencil, Database, Search, Filter, Trash2 } from 'lucide-react';
import { LogMessage } from './LogMessage';

interface AdminPanelProps {
  state: GameState;
  admin: User;
}

export function AdminPanel({ state, admin }: AdminPanelProps) {
  const students = state.users.filter(u => u.role === 'student');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);
  const [isCreateAbilityOpen, setIsCreateAbilityOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [isManageDbOpen, setIsManageDbOpen] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);

  const onlineSet = new Set(state.onlineUserIds || []);
  const filteredStudents = students.filter(s => filterOnline ? onlineSet.has(s.id) : true);

  const handleClearLogs = async () => {
    if (!confirm('Вы уверены, что хотите очистить все логи?')) return;
    await fetch('/api/admin/clear-logs', { method: 'POST' });
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full max-w-7xl mx-auto gap-6 p-4">
      
      {/* Left Column - Students List */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        {/* Admin Profile Button */}
        <button 
          onClick={() => setSelectedStudent(admin)}
          className={`w-full text-left p-3 border rounded-sm flex items-center gap-3 transition-colors ${selectedStudent?.id === admin.id ? 'bg-zinc-800 border-amber-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/30'}`}
        >
          <div className="relative flex-shrink-0">
            {admin.photoUrl ? (
              <img src={admin.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-amber-500/50" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center border border-amber-500/50 text-amber-500/50">
                <Settings size={20} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-amber-500 font-serif truncate">{admin.nickname || admin.fullname || admin.username}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Архимаг (Мой профиль)</div>
          </div>
        </button>

        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden flex flex-col min-h-[250px] flex-1">
          <div className="bg-zinc-950 p-3 border-b border-zinc-800 flex flex-col gap-2">
            <h2 className="font-serif text-lg text-amber-500/90 font-medium">Ученики ({filteredStudents.length})</h2>
            <div className="flex gap-2 text-xs">
              <button 
                onClick={() => setFilterOnline(false)}
                className={`px-2 py-1 rounded-sm transition-colors ${!filterOnline ? 'bg-amber-500/20 text-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Все
              </button>
              <button 
                onClick={() => setFilterOnline(true)}
                className={`px-2 py-1 rounded-sm transition-colors ${filterOnline ? 'bg-green-500/20 text-green-500' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Онлайн
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredStudents.map(s => {
              const isOnline = onlineSet.has(s.id);
              return (
                <button 
                  key={s.id} 
                  onClick={() => setSelectedStudent(s)}
                  className="w-full text-left p-3 rounded-sm flex items-center gap-3 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
                >
                  <div className="relative">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-500">
                        <UserCircle size={24} />
                      </div>
                    )}
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
                    )}
                  </div>
                  <span className="text-zinc-200 font-serif flex-1">{s.nickname || s.fullname || s.username}</span>
                </button>
              );
            })}
            {filteredStudents.length === 0 && <div className="text-zinc-500 text-center py-8 text-sm">Нет учеников</div>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm flex flex-col gap-3">
          <h3 className="font-serif text-amber-500/90 mb-2">Создание сущностей</h3>
          <Button onClick={() => setIsCreateItemOpen(true)} className="w-full justify-start gap-2">
            <BookOpen size={18} /> Создать предмет
          </Button>
          <Button onClick={() => setIsCreateAbilityOpen(true)} className="w-full justify-start gap-2">
            <Swords size={18} /> Создать способность
          </Button>
          <Button onClick={() => setIsImportJsonOpen(true)} className="w-full justify-start gap-2" variant="secondary">
            <Upload size={18} /> Импорт из JSON
          </Button>
          <Button onClick={() => setIsManageDbOpen(true)} className="w-full justify-start gap-2" variant="secondary">
            <Database size={18} /> База знаний
          </Button>
        </div>
      </div>

      {/* Middle/Right Column - Profile or Logs */}
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        {selectedStudent ? (
          <StudentProfile adminView student={state.users.find(u => u.id === selectedStudent.id) || selectedStudent} state={state} onClose={() => setSelectedStudent(null)} />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex-1 flex flex-col overflow-hidden relative max-h-[400px] md:max-h-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-zinc-900 to-zinc-900 pointer-events-none" />
            <div className="bg-zinc-950/80 p-4 border-b border-zinc-800 flex items-center justify-between z-10">
              <h2 className="font-serif text-xl text-amber-500/90 font-medium tracking-wide">Arcane Logs</h2>
              <div className="flex gap-3 items-center">
                <button onClick={handleClearLogs} className="text-zinc-500 hover:text-red-500 transition-colors" title="Очистить логи">
                  <Trash2 size={18} />
                </button>
                <Clock size={18} className="text-zinc-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 z-10 max-h-[300px] md:max-h-[600px]">
              {[...state.logs].reverse().map(log => (
                <div key={log.id} className="text-sm p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-sm">
                  <div className="text-zinc-500 text-xs mb-1 font-mono">
                    {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm')}
                  </div>
                  <div className="text-zinc-300">
                    <LogMessage message={log.message} state={state} />
                  </div>
                </div>
              ))}
              {state.logs.length === 0 && (
                <div className="text-zinc-500 text-center py-8">Пустота...</div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateItemModal isOpen={isCreateItemOpen} onClose={() => setIsCreateItemOpen(false)} />
      <CreateAbilityModal isOpen={isCreateAbilityOpen} onClose={() => setIsCreateAbilityOpen(false)} />
      <ImportJsonModal isOpen={isImportJsonOpen} onClose={() => setIsImportJsonOpen(false)} />
      <ManageDbModal isOpen={isManageDbOpen} onClose={() => setIsManageDbOpen(false)} state={state} />
    </div>
  );
}

// Additional components for Profile & Modals below

function StudentProfile({ adminView, student, state, onClose }: { adminView?: boolean, student: User, state: GameState, onClose: () => void }) {
  const [photoUrl, setPhotoUrl] = useState(student.photoUrl || '');
  const [nickname, setNickname] = useState(student.nickname || '');
  const [isGiveItemOpen, setIsGiveItemOpen] = useState(false);
  const [isTeachAbilityOpen, setIsTeachAbilityOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [abilitySearch, setAbilitySearch] = useState('');
  const [abilityFilters, setAbilityFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const toggleFilter = (filter: string) => {
    setAbilityFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  // Sync state when student prop changes
  React.useEffect(() => {
    setPhotoUrl(student.photoUrl || '');
    setNickname(student.nickname || '');
  }, [student]);

  const studentItems = state.userItems.filter(ui => ui.userId === student.id).map(ui => {
    const item = state.items.find(i => i.id === ui.itemId);
    return { ...ui, item };
  });

  const studentAbilities = state.userAbilities.filter(ua => ua.userId === student.id).map(ua => {
    const ability = state.abilities.find(a => a.id === ua.abilityId);
    return { ...ua, ability };
  });

  const filteredItems = studentItems.filter(ui => ui.item?.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const filteredAbilities = studentAbilities.filter(ua => {
    if (!ua.ability) return false;
    if (!ua.ability.name.toLowerCase().includes(abilitySearch.toLowerCase())) return false;
    
    if (abilityFilters.length === 0) return true;

    let matches = false;
    for (const filter of abilityFilters) {
      if (filter === 'active' && ua.ability.type === 'active') matches = true;
      if (filter === 'passive' && ua.ability.type === 'passive') matches = true;
      if (filter === 'has_cd' && ua.ability.cooldown && ua.ability.cooldown > 0) matches = true;
      if (filter === 'has_chance' && ua.ability.successChance !== undefined && ua.ability.successChance < 100) matches = true;
    }
    
    return matches;
  });

  const handleUpdatePhoto = async () => {
    await fetch('/api/admin/update-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: student.id, photoUrl })
    });
  };

  const handleUpdateNickname = async () => {
    await fetch('/api/admin/set-nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: student.id, nickname })
    });
  };

  const displayName = student.nickname || student.fullname || student.username;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-sm flex-1 flex flex-col overflow-hidden">
      <div className="bg-zinc-950 p-4 border-b border-zinc-800 flex justify-between items-start">
        <div className="flex gap-4 items-center">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-red-900/50" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-red-900/50 text-zinc-500">
              <UserCircle size={32} />
            </div>
          )}
          <div>
            <h2 className="font-serif text-2xl text-red-50 font-medium">{displayName}</h2>
            <div className="text-zinc-500 text-sm">{student.role === 'admin' ? 'Архимаг' : 'Ученик'} ({student.username})</div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">Закрыть</button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        <div className="space-y-4 bg-zinc-950/50 p-4 border border-zinc-800 rounded-sm">
          <div className="space-y-2">
            <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Игровой никнейм</label>
            <div className="flex gap-2">
              <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Например: Темный лорд" />
              <Button onClick={handleUpdateNickname} variant="secondary">Сохранить</Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-amber-500/80 uppercase tracking-wider font-semibold">Фото (URL или загрузка)</label>
            <div className="flex gap-2">
              <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://..." />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                id={`photo-upload-${student.id}`} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => setPhotoUrl(event.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <Button onClick={() => document.getElementById(`photo-upload-${student.id}`)?.click()} variant="secondary" className="px-3" title="Загрузить">
                <Upload size={16} />
              </Button>
              <Button onClick={handleUpdatePhoto} variant="secondary">Сохранить</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 flex flex-col max-h-[350px]">
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-serif text-lg text-zinc-200">Инвентарь</h3>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="relative w-full max-w-[120px]">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-1 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                {student.role !== 'admin' && (
                  <Button onClick={() => setIsGiveItemOpen(true)} variant="secondary" className="text-xs py-1 px-2 flex-shrink-0">Выдать</Button>
                )}
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {filteredItems.map(ui => ui.item && (
                <Tooltip key={ui.id} align="right" content={ui.item.description}>
                  <div className="relative group p-2 bg-zinc-950/50 border border-zinc-800 rounded-sm flex items-center gap-3 hover:border-zinc-600 transition-colors cursor-pointer">
                    {ui.item.iconUrl ? (
                      <img src={ui.item.iconUrl} alt="" className="w-10 h-10 object-cover rounded-sm border border-zinc-800 flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 font-mono text-xs flex-shrink-0">?</div>
                    )}
                    <div className="flex-1 font-medium text-red-100 truncate">{ui.item.name}</div>
                  </div>
                </Tooltip>
              ))}
              {filteredItems.length === 0 && <div className="text-zinc-600 text-sm">{studentItems.length === 0 ? 'Пусто' : 'Ничего не найдено'}</div>}
            </div>
          </div>

          <div className="space-y-3 flex flex-col max-h-[350px]">
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-serif text-lg text-zinc-200">Способности</h3>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <div className="relative w-full max-w-[120px]">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={abilitySearch}
                    onChange={e => setAbilitySearch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-sm py-1 pl-7 pr-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`h-[26px] px-2 flex items-center justify-center rounded-sm border transition-colors ${abilityFilters.length > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}
                  >
                    <Filter size={14} />
                  </button>
                  
                  {isFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-950 border border-zinc-800 rounded-sm shadow-xl z-50 py-2 flex flex-col">
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('active')} onChange={() => toggleFilter('active')} className="accent-amber-500" />
                          Активные
                        </label>
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('passive')} onChange={() => toggleFilter('passive')} className="accent-amber-500" />
                          Пассивные
                        </label>
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('has_cd')} onChange={() => toggleFilter('has_cd')} className="accent-amber-500" />
                          С откатом (КД)
                        </label>
                        <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 transition-colors">
                          <input type="checkbox" checked={abilityFilters.includes('has_chance')} onChange={() => toggleFilter('has_chance')} className="accent-amber-500" />
                          С шансом
                        </label>
                      </div>
                    </>
                  )}
                </div>
                {student.role !== 'admin' && (
                  <Button onClick={() => setIsTeachAbilityOpen(true)} variant="secondary" className="text-xs py-1 px-2 flex-shrink-0">Обучить</Button>
                )}
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 flex-1">
              {filteredAbilities.map(ua => ua.ability && (
                <AdminAbilityCard key={ua.id} ua={ua} ability={ua.ability} />
              ))}
              {studentAbilities.length === 0 && <div className="text-zinc-600 text-sm">Нет способностей</div>}
            </div>
          </div>
        </div>
      </div>

      <GiveItemModal isOpen={isGiveItemOpen} onClose={() => setIsGiveItemOpen(false)} studentId={student.id} items={state.items} />
      <TeachAbilityModal isOpen={isTeachAbilityOpen} onClose={() => setIsTeachAbilityOpen(false)} studentId={student.id} abilities={state.abilities} />
    </div>
  );
}

function CreateItemModal({ isOpen, onClose, initialData }: { isOpen: boolean, onClose: () => void, initialData?: any }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setDesc(initialData?.description || '');
      setIconUrl(initialData?.iconUrl || '');
    }
  }, [isOpen, initialData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setIconUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const endpoint = initialData ? '/api/admin/edit-item' : '/api/admin/create-item';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: initialData?.id, name, description: desc, iconUrl })
    });
    if (!initialData) { setName(''); setDesc(''); setIconUrl(''); }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Изменить предмет" : "Создать предмет"}>
      <div className="space-y-4">
        <Input placeholder="Название предмета" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-4 items-center">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-12 h-12 rounded-sm object-cover border border-zinc-700" />
          ) : (
            <div className="w-12 h-12 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 text-xs flex-shrink-0">?</div>
          )}
          <div className="flex-1 space-y-2">
            <Input placeholder="URL изображения" value={iconUrl} onChange={e => setIconUrl(e.target.value)} />
            <label className="text-xs text-amber-500 cursor-pointer hover:underline block">
              Или загрузить файл с устройства...
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
        <Input placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        <Button onClick={submit} className="w-full">{initialData ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </Modal>
  );
}

function CreateAbilityModal({ isOpen, onClose, initialData }: { isOpen: boolean, onClose: () => void, initialData?: any }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [type, setType] = useState('active');
  const [target, setTarget] = useState('self');
  const [cooldown, setCooldown] = useState('10');
  const [successChance, setSuccessChance] = useState('100');

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setDesc(initialData?.description || '');
      setIconUrl(initialData?.iconUrl || '');
      setType(initialData?.type || 'active');
      setTarget(initialData?.target || 'self');
      setCooldown(initialData?.cooldown ? String(initialData.cooldown) : '10');
      setSuccessChance(initialData?.successChance !== undefined ? String(initialData.successChance) : '100');
    }
  }, [isOpen, initialData]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setIconUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const endpoint = initialData ? '/api/admin/edit-ability' : '/api/admin/create-ability';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: initialData?.id, name, description: desc, type, target, cooldown: Number(cooldown), iconUrl, successChance: Number(successChance) })
    });
    if (!initialData) { setName(''); setDesc(''); setCooldown('10'); setIconUrl(''); setSuccessChance('100'); }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Изменить способность" : "Создать способность"}>
      <div className="space-y-4">
        <Input placeholder="Название способности" value={name} onChange={e => setName(e.target.value)} />
        
        <div className="flex gap-4 items-center">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-12 h-12 rounded-sm object-cover border border-zinc-700" />
          ) : (
            <div className="w-12 h-12 bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 text-xs flex-shrink-0">?</div>
          )}
          <div className="flex-1 space-y-2">
            <Input placeholder="URL изображения" value={iconUrl} onChange={e => setIconUrl(e.target.value)} />
            <label className="text-xs text-amber-500 cursor-pointer hover:underline block">
              Или загрузить файл с устройства...
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        <Input placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} />
        
        <Select value={type} onChange={e => setType(e.target.value)}>
          <option value="active">Активная</option>
          <option value="passive">Пассивная</option>
        </Select>

        <Select value={target} onChange={e => setTarget(e.target.value)}>
          <option value="self">На себя</option>
          <option value="ally">На союзника</option>
        </Select>

        {type === 'active' && (
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Кулдаун (секунд)</label>
            <Input type="number" min="0" value={cooldown} onChange={e => setCooldown(e.target.value)} />
          </div>
        )}

        <div>
          <label className="text-xs text-zinc-500 mb-1 block">Шанс успеха (%)</label>
          <Input type="number" min="1" max="100" value={successChance} onChange={e => setSuccessChance(e.target.value)} />
        </div>

        <Button onClick={submit} className="w-full">{initialData ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </Modal>
  );
}

function GiveItemModal({ isOpen, onClose, studentId, items }: { isOpen: boolean, onClose: () => void, studentId: number, items: any[] }) {
  const [itemId, setItemId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  
  React.useEffect(() => { 
    if (!isOpen) {
      setItemId(''); 
      setSearch('');
    }
  }, [isOpen]);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const submit = async () => {
    if (!itemId) return;
    await fetch('/api/admin/grant-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: studentId, itemId })
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Выдать предмет">
      <div className="space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Поиск предмета..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1.5 pl-7 pr-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
          {filteredItems.map(item => (
            <Tooltip key={item.id} align="right" content={item.description}>
              <button
                onClick={() => setItemId(item.id)}
                className={`w-full text-left relative group p-2 bg-zinc-900/50 border rounded-sm flex items-center gap-3 transition-colors ${
                  itemId === item.id ? 'border-amber-500 bg-zinc-800/80' : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt="" className="w-10 h-10 object-cover rounded-sm border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 bg-zinc-950 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 font-mono text-xs flex-shrink-0">?</div>
                )}
                <div className="flex-1 font-medium text-red-100">{item.name}</div>
              </button>
            </Tooltip>
          ))}
          {filteredItems.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">{items.length === 0 ? 'Нет доступных предметов' : 'Ничего не найдено'}</div>}
        </div>
        <Button onClick={submit} className="w-full" disabled={!itemId}>Выдать</Button>
      </div>
    </Modal>
  );
}

function TeachAbilityModal({ isOpen, onClose, studentId, abilities }: { isOpen: boolean, onClose: () => void, studentId: number, abilities: any[] }) {
  const [abilityId, setAbilityId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  React.useEffect(() => { 
    if (!isOpen) {
      setAbilityId(''); 
      setSearch('');
      setFilters([]);
      setIsFilterOpen(false);
    }
  }, [isOpen]);

  const toggleFilter = (filter: string) => {
    setFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredAbilities = abilities.filter(ability => {
    if (!ability.name.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (filters.length === 0) return true;

    let matches = false;
    for (const filter of filters) {
      if (filter === 'active' && ability.type === 'active') matches = true;
      if (filter === 'passive' && ability.type === 'passive') matches = true;
      if (filter === 'has_cd' && ability.cooldown && ability.cooldown > 0) matches = true;
      if (filter === 'has_chance' && ability.successChance !== undefined && ability.successChance < 100) matches = true;
    }
    
    return matches;
  });

  const submit = async () => {
    if (!abilityId) return;
    await fetch('/api/admin/teach-ability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: studentId, abilityId })
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Обучить способности">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Поиск способности..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1.5 pl-7 pr-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`h-[34px] px-3 flex items-center justify-center rounded-sm border transition-colors ${filters.length > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}
            >
              <Filter size={16} />
            </button>
            
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl z-50 py-2 flex flex-col">
                  <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                    <input type="checkbox" checked={filters.includes('active')} onChange={() => toggleFilter('active')} className="accent-amber-500" />
                    Активные
                  </label>
                  <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                    <input type="checkbox" checked={filters.includes('passive')} onChange={() => toggleFilter('passive')} className="accent-amber-500" />
                    Пассивные
                  </label>
                  <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                    <input type="checkbox" checked={filters.includes('has_cd')} onChange={() => toggleFilter('has_cd')} className="accent-amber-500" />
                    С откатом (КД)
                  </label>
                  <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                    <input type="checkbox" checked={filters.includes('has_chance')} onChange={() => toggleFilter('has_chance')} className="accent-amber-500" />
                    С шансом
                  </label>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
          {filteredAbilities.map(ability => (
            <Tooltip
              key={ability.id}
              align="right"
              content={
                <>
                  {ability.description}
                  {ability.type === 'active' && <div className="mt-1 text-red-400/80">КД: {ability.cooldown} сек.</div>}
                  {ability.successChance !== undefined && ability.successChance < 100 && (
                    <div className="text-amber-400/80 mt-1">Шанс успеха: {ability.successChance}%</div>
                  )}
                </>
              }
            >
              <button
                onClick={() => setAbilityId(ability.id)}
                className={`w-full text-left relative group p-2 bg-zinc-900/50 border rounded-sm flex items-center gap-3 transition-colors ${
                  abilityId === ability.id ? 'border-amber-500 bg-zinc-800/80' : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="relative w-10 h-10 flex-shrink-0 border border-zinc-700 rounded-sm overflow-hidden bg-zinc-950 flex items-center justify-center">
                  {ability.iconUrl ? (
                    <img src={ability.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-700 font-mono text-xs">?</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-amber-200/90">{ability.name}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {ability.type === 'active' ? 'Активная' : 'Пассивная'}
                  </div>
                </div>
              </button>
            </Tooltip>
          ))}
          {filteredAbilities.length === 0 && <div className="text-zinc-600 text-sm text-center py-4">{abilities.length === 0 ? 'Нет доступных способностей' : 'Ничего не найдено'}</div>}
        </div>
        <Button onClick={submit} className="w-full" disabled={!abilityId}>Обучить</Button>
      </div>
    </Modal>
  );
}

function ImportJsonModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      const res = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json })
      });

      if (!res.ok) throw new Error('Ошибка при импорте');
      
      onClose();
    } catch (err) {
      setError('Неверный формат JSON файла или ошибка сервера');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Импорт из JSON">
      <div className="space-y-4">
        <div className="text-xs text-zinc-400 space-y-2 bg-zinc-950 p-3 rounded-sm border border-zinc-800 font-mono">
          <p>Пример структуры файла:</p>
          <pre className="text-[10px] text-amber-500/70 overflow-x-auto">
{`[
  {
    "username": "Renat", // необязательно: если убрать, добавится только в базу знаний
    "type": "ability",
    "name": "Fireball",
    "description": "Огненный шар",
    "abilityType": "active",
    "target": "ally",
    "cooldown": 10,
    "iconUrl": "https://..." // необязательно: если убрать, сгенерируется картинка с первой буквой
  },
  {
    "type": "item", // username не указан, значит добавится только в базу
    "name": "Зелье здоровья",
    "description": "Восстанавливает ХП",
    "iconUrl": "https://..."
  }
]`}
          </pre>
        </div>
        
        {error && <div className="text-red-500 text-xs">{error}</div>}

        <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-zinc-700 rounded-sm hover:border-red-900/50 hover:bg-zinc-800/50 transition-colors cursor-pointer text-zinc-300">
          <span className="font-serif">{loading ? 'Загрузка...' : 'Выбрать .json файл'}</span>
          <input type="file" accept=".json" className="hidden" onChange={handleFileChange} disabled={loading} />
        </label>
      </div>
    </Modal>
  );
}

function ManageDbModal({ isOpen, onClose, state }: { isOpen: boolean, onClose: () => void, state: GameState }) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingAbility, setEditingAbility] = useState<any>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [abilitySearch, setAbilitySearch] = useState('');
  const [abilityFilters, setAbilityFilters] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  React.useEffect(() => { 
    if (!isOpen) {
      setItemSearch('');
      setAbilitySearch('');
      setAbilityFilters([]);
      setIsFilterOpen(false);
    }
  }, [isOpen]);

  const toggleFilter = (filter: string) => {
    setAbilityFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredItems = state.items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()));
  const filteredAbilities = state.abilities.filter(ability => {
    if (!ability.name.toLowerCase().includes(abilitySearch.toLowerCase())) return false;
    
    if (abilityFilters.length === 0) return true;

    let matches = false;
    for (const filter of abilityFilters) {
      if (filter === 'active' && ability.type === 'active') matches = true;
      if (filter === 'passive' && ability.type === 'passive') matches = true;
      if (filter === 'has_cd' && ability.cooldown && ability.cooldown > 0) matches = true;
      if (filter === 'has_chance' && ability.successChance !== undefined && ability.successChance < 100) matches = true;
    }
    
    return matches;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Управление базой знаний">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        <div>
          <div className="sticky top-0 bg-zinc-950 py-2 border-b border-zinc-800 z-10 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-serif text-lg text-zinc-200">Предметы ({filteredItems.length})</h3>
            <div className="relative w-full sm:max-w-[200px]">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Поиск..." 
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1.5 pl-7 pr-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            {filteredItems.map(item => (
              <div key={item.id} className="relative group p-2 bg-zinc-900/50 border border-zinc-800 rounded-sm flex items-center gap-3">
                {item.iconUrl ? (
                  <img src={item.iconUrl} alt="" className="w-10 h-10 object-cover rounded-sm border border-zinc-800" />
                ) : (
                  <div className="w-10 h-10 bg-zinc-950 rounded-sm border border-zinc-800 flex items-center justify-center text-zinc-700 font-mono text-xs flex-shrink-0">?</div>
                )}
                <div className="flex-1 font-medium text-red-100">
                  <Tooltip align="left" content={item.description}>
                    <span className="cursor-help inline-block">{item.name}</span>
                  </Tooltip>
                </div>
                <button 
                  onClick={() => setEditingItem(item)}
                  className="text-zinc-500 hover:text-amber-500 transition-colors p-2 bg-zinc-950 rounded-sm border border-zinc-800"
                  title="Изменить"
                >
                  <Pencil size={14} />
                </button>
              </div>
            ))}
            {filteredItems.length === 0 && <div className="text-zinc-600 text-sm">Ничего не найдено</div>}
          </div>
        </div>

        <div>
          <div className="sticky top-0 bg-zinc-950 py-2 border-b border-zinc-800 z-10 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-serif text-lg text-zinc-200">Способности ({filteredAbilities.length})</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-[200px]">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Поиск..." 
                  value={abilitySearch}
                  onChange={e => setAbilitySearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-sm py-1.5 pl-7 pr-2 text-sm text-zinc-300 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="relative">
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`h-[34px] px-3 flex items-center justify-center rounded-sm border transition-colors ${abilityFilters.length > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'}`}
                >
                  <Filter size={16} />
                </button>
                
                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-zinc-900 border border-zinc-700 rounded-sm shadow-xl z-50 py-2 flex flex-col">
                      <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                        <input type="checkbox" checked={abilityFilters.includes('active')} onChange={() => toggleFilter('active')} className="accent-amber-500" />
                        Активные
                      </label>
                      <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                        <input type="checkbox" checked={abilityFilters.includes('passive')} onChange={() => toggleFilter('passive')} className="accent-amber-500" />
                        Пассивные
                      </label>
                      <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                        <input type="checkbox" checked={abilityFilters.includes('has_cd')} onChange={() => toggleFilter('has_cd')} className="accent-amber-500" />
                        С откатом (КД)
                      </label>
                      <label className="flex items-center gap-2 px-4 py-1.5 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-300 transition-colors">
                        <input type="checkbox" checked={abilityFilters.includes('has_chance')} onChange={() => toggleFilter('has_chance')} className="accent-amber-500" />
                        С шансом
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {filteredAbilities.map(ability => (
              <div key={ability.id} className="relative group p-2 bg-zinc-900/50 border border-zinc-800 rounded-sm flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0 border border-zinc-800 rounded-sm overflow-hidden bg-zinc-950 flex items-center justify-center">
                  {ability.iconUrl ? (
                    <img src={ability.iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-zinc-700 font-mono text-xs">?</span>
                  )}
                </div>
                <div className="flex-1">
                  <Tooltip
                    align="left"
                    content={
                      <>
                        {ability.description}
                        {ability.type === 'active' && <div className="mt-1 text-red-400/80">КД: {ability.cooldown} сек.</div>}
                        {ability.successChance !== undefined && ability.successChance < 100 && (
                          <div className="text-amber-400/80 mt-1">Шанс успеха: {ability.successChance}%</div>
                        )}
                      </>
                    }
                  >
                    <div className="font-medium text-amber-200/90 cursor-help inline-block">{ability.name}</div>
                  </Tooltip>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {ability.type === 'active' ? 'Активная' : 'Пассивная'}
                  </div>
                </div>
                <button 
                  onClick={() => setEditingAbility(ability)}
                  className="text-zinc-500 hover:text-amber-500 transition-colors p-2 bg-zinc-950 rounded-sm border border-zinc-800"
                  title="Изменить"
                >
                  <Pencil size={14} />
                </button>
              </div>
            ))}
            {filteredAbilities.length === 0 && <div className="text-zinc-600 text-sm">Ничего не найдено</div>}
          </div>
        </div>
      </div>

      {editingItem && <CreateItemModal isOpen={true} onClose={() => setEditingItem(null)} initialData={editingItem} />}
      {editingAbility && <CreateAbilityModal isOpen={true} onClose={() => setEditingAbility(null)} initialData={editingAbility} />}
    </Modal>
  );
}

function AdminAbilityCard({ ua, ability }: { ua: any, ability: any }) {
  const [cdLeft, setCdLeft] = useState(0);

  useEffect(() => {
    if (ability.type !== 'active') return;

    const updateTimer = () => {
      const cooldownMs = ability.cooldown * 1000;
      const passed = Date.now() - ua.lastUsedAt;
      if (passed < cooldownMs) {
        setCdLeft(Math.ceil((cooldownMs - passed) / 1000));
      } else {
        setCdLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [ua.lastUsedAt, ability.cooldown, ability.type]);

  const isReady = cdLeft === 0;

  return (
    <Tooltip
      align="left"
      content={
        <>
          {ability.description}
          {ability.type === 'active' && <div className="mt-1 text-red-400/80">КД: {ability.cooldown} сек.</div>}
          {ability.successChance !== undefined && ability.successChance < 100 && (
            <div className="text-amber-400/80 mt-1">Шанс успеха: {ability.successChance}%</div>
          )}
        </>
      }
    >
      <div className={`relative group p-2 bg-zinc-950/50 border border-zinc-800 rounded-sm flex items-center gap-3 transition-colors ${!isReady ? 'grayscale opacity-75' : 'hover:border-zinc-600 cursor-pointer'}`}>
        
        <div className="relative w-12 h-12 flex-shrink-0 border border-zinc-800 rounded-sm overflow-hidden bg-zinc-900 flex items-center justify-center">
          {ability.iconUrl ? (
            <img src={ability.iconUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-zinc-700 font-mono text-xs">?</span>
          )}
          
          {/* Cooldown Overlay */}
          {!isReady && ability.type === 'active' && (
            <div 
              className="absolute bottom-0 left-0 w-full bg-red-950/80 transition-all duration-1000 ease-linear flex flex-col justify-start" 
              style={{ height: `${(cdLeft / ability.cooldown) * 100}%` }}
            >
            </div>
          )}
          
          {/* Cooldown Number */}
          {!isReady && ability.type === 'active' && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs z-20 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
              {cdLeft}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-amber-200/90 truncate">{ability.name}</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            {ability.type === 'active' ? 'Активная' : 'Пассивная'}
          </div>
        </div>
        
        <button 
          onClick={async () => {
            await fetch('/api/admin/remove-ability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userAbilityId: ua.id })
            });
          }}
          className="text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-zinc-900 p-1.5 rounded-sm border border-zinc-800"
          title="Забыть способность"
        >
          <X size={14} />
        </button>
      </div>
    </Tooltip>
  );
}
